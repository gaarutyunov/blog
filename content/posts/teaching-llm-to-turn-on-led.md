---
title: "Teaching LLM to turn on LED"
date: 2025-06-30T05:50:00+00:00
author: "German Arutyunov"
draft: false
tags: ["MCP", "Arduino", "TinyGo", "IoT", "AI"]
categories: ["Technical", "Tutorials"]
---

# Teaching LLM to Turn on LED

In this comprehensive guide, we'll explore how to create a bridge between Large Language Models (LLMs) and physical hardware using the Model Context Protocol (MCP). We'll build a system that allows an AI assistant to control an LED on an Arduino Uno using TinyGo, demonstrating the power of AI-hardware integration in memory-constrained environments.

## Introduction to MCP (Model Context Protocol)

The Model Context Protocol (MCP) is a revolutionary communication standard that enables AI models to interact with external systems and tools. Unlike traditional APIs that require hardcoded integrations, MCP provides a standardized way for AI models to discover and interact with capabilities dynamically.

### Key Benefits of MCP

- **Standardized Communication**: Consistent interface across different tools and services
- **Dynamic Discovery**: AI models can discover available capabilities at runtime
- **Bidirectional Communication**: Supports both client-server and server-client interactions
- **Extensible Architecture**: Easy to add new capabilities without modifying core systems

### MCP Protocol Architecture

MCP operates on a client-server model where:
- **MCP Client**: The AI model or application requesting services
- **MCP Server**: The service provider exposing capabilities
- **Transport Layer**: Communication mechanism (HTTP, WebSocket, stdio)

### Standard Protocol Errors

MCP defines several standard error codes for robust error handling:

- **-32700**: Parse error - Invalid JSON was received
- **-32600**: Invalid Request - The JSON sent is not a valid Request object
- **-32601**: Method not found - The method does not exist or is not available
- **-32602**: Invalid params - Invalid method parameter(s)
- **-32603**: Internal error - Internal JSON-RPC error
- **-32000 to -32099**: Server error - Reserved for implementation-defined server-errors

### HTTP Transport and Streaming

Recent updates to MCP include enhanced HTTP transport support with important lifecycle considerations:

#### Connection Lifecycle

1. **Initialization**: Client sends initial handshake request
2. **Capability Exchange**: Server responds with available methods and tools
3. **Active Communication**: Request-response cycles for tool invocation
4. **Error Handling**: Standardized error responses for robustness

#### Streaming Support Detection

A critical aspect of MCP HTTP transport is streaming support detection:

- **GET Request Test**: Clients may send GET requests to test streaming capabilities
- **405 Method Not Allowed**: Server responds with 405 to GET requests when streaming is not supported
- **Fallback Mechanism**: Clients fall back to request-response mode when streaming unavailable

This mechanism ensures compatibility across different server implementations and network configurations.

## Arduino in Memory-Constrained Environments

### Arduino Uno Technical Specifications

The Arduino Uno is built around the ATmega328P microcontroller with strict hardware limitations:

**Memory Architecture:**
- **Flash Memory**: 32KB (0.5KB used by bootloader) - stores program code
- **SRAM**: 2KB - runtime variables and stack
- **EEPROM**: 1KB - persistent data storage

**Processing Power:**
- **Clock Speed**: 16MHz
- **Architecture**: 8-bit AVR
- **Instruction Set**: RISC with 131 instructions

**I/O Capabilities:**
- **Digital I/O Pins**: 14 (6 with PWM output)
- **Analog Input Pins**: 6 (10-bit ADC)
- **Communication**: UART, SPI, I2C
- **Operating Voltage**: 5V
- **Input Voltage**: 7-12V (recommended)

### Memory Management Challenges

Working with Arduino Uno requires careful memory management:

**SRAM Limitations:**
- Global variables consume SRAM permanently
- Stack grows dynamically during function calls
- String operations can quickly exhaust memory
- Recursive functions risk stack overflow

**Flash Memory Considerations:**
- Program size must fit within ~31.5KB
- Library dependencies reduce available space
- Code optimization techniques essential

**Best Practices for Memory-Constrained Programming:**
- Use `PROGMEM` directive for constants
- Minimize global variable usage
- Prefer local variables with limited scope
- Use efficient data types (uint8_t vs int)
- Implement string handling carefully

## TinyGo: Go for Microcontrollers

TinyGo is a specialized Go compiler designed for microcontrollers and WebAssembly, making it perfect for memory-constrained environments like the Arduino Uno.

### Why TinyGo for Arduino Development?

**Memory Efficiency:**
- Smaller binary sizes compared to standard Go
- Optimized garbage collector for low-memory environments
- Support for bare-metal programming

**Language Benefits:**
- Familiar Go syntax and idioms
- Built-in concurrency with goroutines (limited)
- Strong typing system
- Excellent tooling and debugging support

### TinyGo Memory Management

TinyGo uses several strategies to work within Arduino's constraints:

**Compile-Time Optimizations:**
- Dead code elimination
- Constant folding
- Inline function expansion
- Memory layout optimization

**Runtime Considerations:**
- Conservative garbage collector
- Stack-based allocation when possible
- Minimal runtime overhead
- Efficient string handling

**Memory-Conscious Programming Patterns:**
```go
// Prefer arrays over slices for fixed-size data
var buffer [64]byte

// Use constants for strings stored in flash
const statusMessage = "Device ready"

// Minimize heap allocations
func processData(data []byte) {
    // Work with provided buffer instead of allocating
    for i, b := range data {
        // Process byte without creating new variables
        _ = b + 1
    }
}
```

## The TinyMCP Project Architecture

The TinyMCP project creates a bridge between MCP clients and Arduino hardware, enabling AI models to control physical devices through a standardized protocol.

### Core Components

#### 1. MCP Server Implementation

The TinyGo MCP server running on Arduino handles:
- JSON-RPC message parsing and validation
- Tool discovery and capability advertisement
- Hardware abstraction for GPIO operations
- Error handling and status reporting

#### 2. Communication Layer

**Serial Communication:**
- UART interface at 9600 baud
- JSON message framing
- Flow control for reliable data transfer
- Buffer management for memory efficiency

**Protocol Implementation:**
```go
type MCPRequest struct {
    JSONRPC string      `json:"jsonrpc"`
    Method  string      `json:"method"`
    Params  interface{} `json:"params,omitempty"`
    ID      interface{} `json:"id"`
}

type MCPResponse struct {
    JSONRPC string      `json:"jsonrpc"`
    Result  interface{} `json:"result,omitempty"`
    Error   *MCPError   `json:"error,omitempty"`
    ID      interface{} `json:"id"`
}
```

#### 3. Hardware Abstraction

The server provides standardized interfaces for:
- **GPIO Control**: Digital pin read/write operations
- **PWM Generation**: Analog output simulation
- **ADC Reading**: Analog input sampling
- **Status Monitoring**: Device health and connectivity

### Tool Implementation

#### LED Control Tool

```go
type LEDControlParams struct {
    Pin   uint8 `json:"pin"`
    State bool  `json:"state"`
}

func (s *MCPServer) handleLEDControl(params LEDControlParams) error {
    if params.Pin > 13 {
        return fmt.Errorf("invalid pin number: %d", params.Pin)
    }
    
    machine.Pin(params.Pin).Configure(machine.PinConfig{
        Mode: machine.PinOutput,
    })
    
    if params.State {
        machine.Pin(params.Pin).High()
    } else {
        machine.Pin(params.Pin).Low()
    }
    
    return nil
}
```

#### Status Monitoring Tool

```go
type StatusResponse struct {
    Uptime    uint32            `json:"uptime_ms"`
    FreeRAM   uint16            `json:"free_ram_bytes"`
    PinStates map[string]bool   `json:"pin_states"`
}

func (s *MCPServer) getDeviceStatus() StatusResponse {
    return StatusResponse{
        Uptime:  uint32(time.Since(s.startTime).Milliseconds()),
        FreeRAM: s.getFreeRAM(),
        PinStates: s.getPinStates(),
    }
}
```

## Step-by-Step Implementation

### Step 1: Hardware Setup

**Components Required:**
- Arduino Uno R3
- LED (any color)
- 220Ω resistor
- Breadboard
- Jumper wires
- USB cable

**Wiring Diagram:**
```
Arduino Pin 13 → 220Ω Resistor → LED Anode
LED Cathode → Arduino GND
```

### Step 2: Development Environment Setup

**Install TinyGo:**
```bash
# Download and install TinyGo for your platform
# https://tinygo.org/getting-started/install/

# Verify installation
tinygo version
```

**Set up the project:**
```bash
mkdir tinymcp
cd tinymcp
go mod init github.com/gaarutyunov/tinymcp
```

### Step 3: Core MCP Server Implementation

**main.go:**
```go
package main

import (
    "encoding/json"
    "machine"
    "time"
)

type MCPServer struct {
    startTime time.Time
    tools     map[string]ToolHandler
}

type ToolHandler func(params json.RawMessage) (interface{}, error)

func NewMCPServer() *MCPServer {
    s := &MCPServer{
        startTime: time.Now(),
        tools:     make(map[string]ToolHandler),
    }
    
    s.registerTools()
    return s
}

func (s *MCPServer) registerTools() {
    s.tools["led_control"] = s.handleLEDControl
    s.tools["get_status"] = s.handleGetStatus
    s.tools["read_pin"] = s.handleReadPin
}

func main() {
    server := NewMCPServer()
    server.Run()
}
```

### Step 4: Message Processing Loop

**Communication handling:**
```go
func (s *MCPServer) Run() {
    buffer := make([]byte, 256)
    
    for {
        n, err := machine.UART0.Read(buffer)
        if err != nil || n == 0 {
            time.Sleep(10 * time.Millisecond)
            continue
        }
        
        var request MCPRequest
        if err := json.Unmarshal(buffer[:n], &request); err != nil {
            s.sendError(-32700, "Parse error", request.ID)
            continue
        }
        
        s.processRequest(request)
    }
}

func (s *MCPServer) processRequest(req MCPRequest) {
    handler, exists := s.tools[req.Method]
    if !exists {
        s.sendError(-32601, "Method not found", req.ID)
        return
    }
    
    result, err := handler(req.Params)
    if err != nil {
        s.sendError(-32603, err.Error(), req.ID)
        return
    }
    
    s.sendResponse(result, req.ID)
}
```

### Step 5: Tool Implementations

**Complete tool handlers:**
```go
func (s *MCPServer) handleLEDControl(params json.RawMessage) (interface{}, error) {
    var p struct {
        Pin   uint8 `json:"pin"`
        State bool  `json:"state"`
    }
    
    if err := json.Unmarshal(params, &p); err != nil {
        return nil, err
    }
    
    pin := machine.Pin(p.Pin)
    pin.Configure(machine.PinConfig{Mode: machine.PinOutput})
    
    if p.State {
        pin.High()
    } else {
        pin.Low()
    }
    
    return map[string]interface{}{
        "success": true,
        "pin":     p.Pin,
        "state":   p.State,
    }, nil
}

func (s *MCPServer) handleReadPin(params json.RawMessage) (interface{}, error) {
    var p struct {
        Pin uint8 `json:"pin"`
    }
    
    if err := json.Unmarshal(params, &p); err != nil {
        return nil, err
    }
    
    pin := machine.Pin(p.Pin)
    pin.Configure(machine.PinConfig{Mode: machine.PinInput})
    
    return map[string]interface{}{
        "pin":   p.Pin,
        "value": pin.Get(),
    }, nil
}
```

### Step 6: Build and Flash

**Compile and upload:**
```bash
# Build for Arduino Uno
tinygo build -target=arduino -o firmware.hex .

# Flash to device (adjust port as needed)
tinygo flash -target=arduino -port=/dev/ttyUSB0 .
```

### Step 7: Client Integration

**Python MCP client example:**
```python
import serial
import json
import time

class MCPClient:
    def __init__(self, port='/dev/ttyUSB0', baudrate=9600):
        self.serial = serial.Serial(port, baudrate, timeout=1)
        time.sleep(2)  # Wait for Arduino reset
    
    def send_request(self, method, params=None, request_id=1):
        request = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": request_id
        }
        
        message = json.dumps(request) + '\n'
        self.serial.write(message.encode())
        
        response = self.serial.readline().decode().strip()
        return json.loads(response) if response else None
    
    def control_led(self, pin, state):
        return self.send_request("led_control", {
            "pin": pin,
            "state": state
        })
    
    def get_status(self):
        return self.send_request("get_status")

# Usage example
client = MCPClient()
client.control_led(13, True)   # Turn on LED
time.sleep(1)
client.control_led(13, False)  # Turn off LED
status = client.get_status()
print(f"Device status: {status}")
```

## Testing and Validation

### Unit Testing

**Test GPIO operations:**
```go
func TestLEDControl(t *testing.T) {
    server := NewMCPServer()
    
    params := json.RawMessage(`{"pin": 13, "state": true}`)
    result, err := server.handleLEDControl(params)
    
    if err != nil {
        t.Fatalf("LED control failed: %v", err)
    }
    
    // Verify result structure
    resultMap := result.(map[string]interface{})
    if !resultMap["success"].(bool) {
        t.Error("LED control reported failure")
    }
}
```

### Integration Testing

**End-to-end communication test:**
```python
def test_communication_reliability():
    client = MCPClient()
    
    # Test multiple rapid requests
    for i in range(100):
        response = client.control_led(13, i % 2 == 0)
        assert response is not None
        assert 'error' not in response
    
    print("Communication reliability test passed")
```

### Performance Monitoring

**Memory usage tracking:**
```go
func (s *MCPServer) getFreeRAM() uint16 {
    // Implementation depends on TinyGo runtime
    // This is a simplified example
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    return uint16(m.Sys - m.Alloc)
}
```

## Advanced Features and Optimizations

### Batch Operations

Support multiple GPIO operations in a single request:
```go
type BatchOperation struct {
    Pin   uint8  `json:"pin"`
    State bool   `json:"state"`
    Delay uint16 `json:"delay_ms,omitempty"`
}

func (s *MCPServer) handleBatchControl(params json.RawMessage) (interface{}, error) {
    var operations []BatchOperation
    if err := json.Unmarshal(params, &operations); err != nil {
        return nil, err
    }
    
    results := make([]map[string]interface{}, len(operations))
    
    for i, op := range operations {
        // Execute operation
        pin := machine.Pin(op.Pin)
        pin.Configure(machine.PinConfig{Mode: machine.PinOutput})
        
        if op.State {
            pin.High()
        } else {
            pin.Low()
        }
        
        if op.Delay > 0 {
            time.Sleep(time.Duration(op.Delay) * time.Millisecond)
        }
        
        results[i] = map[string]interface{}{
            "pin":     op.Pin,
            "state":   op.State,
            "success": true,
        }
    }
    
    return results, nil
}
```

### Watchdog Implementation

Ensure system reliability with a watchdog timer:
```go
func (s *MCPServer) enableWatchdog() {
    // Enable hardware watchdog for ~8 seconds
    machine.WDTCSR.Set(0x18) // Set WDCE and WDE
    machine.WDTCSR.Set(0x21) // Set WDE and timeout
}

func (s *MCPServer) feedWatchdog() {
    asm("wdr") // Reset watchdog timer
}
```

## Future Enhancements

### Sensor Integration

Expand capabilities with sensor support:
- Temperature and humidity sensors (DHT22)
- Motion detection (PIR sensors)
- Light sensors (photoresistors)
- Distance measurement (ultrasonic sensors)

### Network Connectivity

Add WiFi support for remote operation:
- ESP32 integration for WiFi connectivity
- MQTT protocol support
- Web-based control interface
- Cloud integration capabilities

### Advanced MCP Features

Implement additional MCP capabilities:
- Resource subscriptions for real-time updates
- Prompt templates for common operations
- Tool chaining for complex workflows
- Event notifications for sensor triggers

## Conclusion

This project demonstrates the powerful combination of MCP, TinyGo, and Arduino for creating AI-controlled hardware systems. Despite the memory constraints of the Arduino Uno, we've successfully implemented a robust communication protocol that enables seamless interaction between AI models and physical devices.

The key insights from this implementation:

1. **Protocol Design**: MCP provides a standardized way to expose hardware capabilities to AI systems
2. **Memory Management**: Careful programming is essential in constrained environments
3. **Error Handling**: Robust error handling ensures reliable operation
4. **Extensibility**: The modular design allows easy addition of new capabilities

This foundation opens possibilities for complex AI-hardware interactions, from simple LED control to sophisticated sensor networks and automation systems.

## Resources

- [TinyMCP Repository](https://github.com/gaarutyunov/tinymcp)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [TinyGo Documentation](https://tinygo.org/docs/)
- [Arduino Reference](https://www.arduino.cc/reference/en/)

---

*This blog post demonstrates practical AI-hardware integration using modern protocols and efficient programming techniques. The complete source code and additional examples are available in the TinyMCP repository.*