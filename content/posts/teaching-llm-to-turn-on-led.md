---
title: "Teaching LLM to Turn On LED"
date: 2025-06-29T23:21:00+00:00
author: "German Arutyunov"
cover: ""
tags: ["mcp", "arduino", "tinygo", "llm", "iot", "hardware"]
keywords: ["model context protocol", "arduino", "tinygo", "led control", "ai hardware", "microcontroller"]
description: "Explore how to bridge the gap between Large Language Models and physical hardware using MCP, Arduino, and TinyGo to create AI-controlled LED systems."
showFullContent: false
readingTime: true
hideComments: false
color: ""
---

In the rapidly evolving world of AI and IoT, one of the most exciting frontiers is enabling Large Language Models (LLMs) to interact directly with physical hardware. Today, we'll explore how to teach an LLM to control an LED using the Model Context Protocol (MCP), Arduino, and TinyGo through my [tinymcp project](https://github.com/gaarutyunov/tinymcp).

## The Vision: AI Meets Hardware

Imagine typing "Turn on the LED" to an AI assistant and watching a physical LED light up in response. This seemingly simple interaction represents a fundamental shift in how we think about AI-hardware integration. The tinymcp project demonstrates this concept by creating a bridge between the digital world of language models and the physical world of microcontrollers.

## Understanding MCP (Model Context Protocol)

The Model Context Protocol is a standardized way for AI systems to communicate with external tools and services. Unlike traditional APIs that require specific integration for each service, MCP provides a universal interface that allows LLMs to:

- **Discover available capabilities** dynamically
- **Execute commands** on external systems
- **Receive structured responses** that can be processed and understood
- **Maintain context** across multiple interactions

### Why MCP for Hardware Control?

MCP excels in hardware scenarios because it:

1. **Abstracts complexity**: The LLM doesn't need to understand GPIO pins or hardware registers
2. **Provides safety**: Built-in validation and error handling prevent dangerous operations
3. **Enables natural language**: Users can control hardware using conversational commands
4. **Supports discovery**: Hardware capabilities can be dynamically discovered and utilized

## Arduino: The Hardware Foundation

Arduino represents the perfect platform for this integration due to its:

### **Simplicity and Accessibility**
- Straightforward programming model with `setup()` and `loop()` functions
- Extensive library ecosystem for sensors, actuators, and communication
- Strong community support and documentation

### **GPIO Control Fundamentals**
For LED control, we primarily use digital output pins:

```c
// Traditional Arduino C++ approach
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);  // Turn LED on
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);   // Turn LED off
  delay(1000);
}
```

### **Communication Capabilities**
Arduino boards can communicate via:
- **Serial communication** (UART) for simple text commands
- **I2C/SPI** for sensor integration
- **WiFi/Bluetooth** for wireless control
- **Ethernet** for network-based protocols

## TinyGo: Go for Microcontrollers

TinyGo brings the power and simplicity of Go to the microcontroller world, making it an ideal choice for our MCP implementation.

### **Why TinyGo?**

1. **Memory Efficiency**: Optimized for constrained environments
2. **Familiar Syntax**: Leverage Go's simplicity and readability
3. **Strong Typing**: Compile-time error checking prevents runtime issues
4. **Goroutines**: Built-in concurrency for handling multiple tasks
5. **Standard Library**: Access to essential Go packages

### **TinyGo vs Standard Go**

```go
// TinyGo LED control example
package main

import (
    "machine"
    "time"
)

func main() {
    led := machine.LED
    led.Configure(machine.PinConfig{Mode: machine.PinOutput})
    
    for {
        led.High()
        time.Sleep(time.Second)
        led.Low()
        time.Sleep(time.Second)
    }
}
```

Key differences from standard Go:
- **Limited standard library**: Focus on essential embedded functions
- **No garbage collector**: Manual memory management for predictable performance
- **Hardware abstraction**: Direct access to GPIO pins and peripherals
- **Cross-compilation**: Compile for various microcontroller architectures

## The TinyMCP Project Architecture

The tinymcp project creates a seamless bridge between MCP and Arduino hardware through several key components:

### **1. MCP Server Implementation**
The core of the system is an MCP server running on the Arduino that:
- **Listens for MCP commands** via serial or network communication
- **Parses and validates** incoming requests
- **Executes hardware operations** based on command parameters
- **Returns structured responses** with operation status and results

### **2. Hardware Abstraction Layer**
A clean abstraction that maps high-level commands to hardware operations:

```go
type LEDController struct {
    pin machine.Pin
    state bool
}

func (l *LEDController) TurnOn() error {
    l.pin.High()
    l.state = true
    return nil
}

func (l *LEDController) TurnOff() error {
    l.pin.Low()
    l.state = false
    return nil
}

func (l *LEDController) GetState() bool {
    return l.state
}
```

### **3. Command Processing Pipeline**
1. **Command Reception**: Receive MCP messages via communication interface
2. **Parsing**: Extract command type and parameters
3. **Validation**: Ensure command safety and parameter validity
4. **Execution**: Perform the requested hardware operation
5. **Response**: Send structured result back to the LLM

### **4. Communication Interface**
The project supports multiple communication methods:
- **Serial communication** for direct USB connection
- **WiFi integration** for wireless control
- **Bluetooth** for mobile device interaction

## Step-by-Step Implementation Guide

### **Step 1: Hardware Setup**

**Required Components:**
- Arduino board (Uno, Nano, ESP32, etc.)
- LED (or use built-in LED)
- Resistor (220Ω for current limiting)
- Breadboard and jumper wires
- USB cable for programming

**Wiring:**
```
Arduino Pin 13 → LED Anode (longer leg)
LED Cathode → 220Ω Resistor → Arduino GND
```

### **Step 2: Development Environment Setup**

**Install TinyGo:**
```bash
# On macOS
brew install tinygo

# On Linux
wget https://github.com/tinygo-org/tinygo/releases/download/v0.30.0/tinygo_0.30.0_amd64.deb
sudo dpkg -i tinygo_0.30.0_amd64.deb

# Verify installation
tinygo version
```

**Install Arduino IDE or Platform IO** for easier board management and driver installation.

### **Step 3: TinyMCP Server Implementation**

**Core server structure:**
```go
package main

import (
    "encoding/json"
    "machine"
    "time"
)

type MCPRequest struct {
    Method string                 `json:"method"`
    Params map[string]interface{} `json:"params"`
}

type MCPResponse struct {
    Success bool        `json:"success"`
    Result  interface{} `json:"result,omitempty"`
    Error   string      `json:"error,omitempty"`
}

type LEDController struct {
    pin   machine.Pin
    state bool
}

func NewLEDController(pin machine.Pin) *LEDController {
    pin.Configure(machine.PinConfig{Mode: machine.PinOutput})
    return &LEDController{pin: pin, state: false}
}

func (l *LEDController) HandleCommand(method string, params map[string]interface{}) MCPResponse {
    switch method {
    case "led.on":
        l.pin.High()
        l.state = true
        return MCPResponse{Success: true, Result: "LED turned on"}
    
    case "led.off":
        l.pin.Low()
        l.state = false
        return MCPResponse{Success: true, Result: "LED turned off"}
    
    case "led.toggle":
        if l.state {
            l.pin.Low()
            l.state = false
        } else {
            l.pin.High()
            l.state = true
        }
        return MCPResponse{Success: true, Result: map[string]bool{"state": l.state}}
    
    case "led.status":
        return MCPResponse{Success: true, Result: map[string]bool{"state": l.state}}
    
    default:
        return MCPResponse{Success: false, Error: "Unknown method"}
    }
}

func main() {
    // Initialize LED controller
    led := NewLEDController(machine.LED)
    
    // Set up serial communication
    machine.Serial.Configure(machine.UARTConfig{BaudRate: 9600})
    
    println("TinyMCP LED Server started")
    
    // Main server loop
    buffer := make([]byte, 256)
    for {
        if machine.Serial.Buffered() > 0 {
            n, _ := machine.Serial.Read(buffer)
            if n > 0 {
                var request MCPRequest
                if err := json.Unmarshal(buffer[:n], &request); err == nil {
                    response := led.HandleCommand(request.Method, request.Params)
                    if responseData, err := json.Marshal(response); err == nil {
                        machine.Serial.Write(responseData)
                        machine.Serial.Write([]byte("\n"))
                    }
                }
            }
        }
        time.Sleep(100 * time.Millisecond)
    }
}
```

### **Step 4: Compilation and Deployment**

**Compile for Arduino:**
```bash
# For Arduino Uno
tinygo build -target arduino -o main.hex main.go

# For ESP32
tinygo build -target esp32-devkitc -o main.bin main.go

# Flash to device
tinygo flash -target arduino main.go
```

### **Step 5: MCP Client Integration**

**Python client example:**
```python
import serial
import json
import time

class TinyMCPClient:
    def __init__(self, port='/dev/ttyACM0', baudrate=9600):
        self.serial = serial.Serial(port, baudrate)
        time.sleep(2)  # Wait for Arduino to initialize
    
    def send_command(self, method, params=None):
        request = {
            "method": method,
            "params": params or {}
        }
        
        command = json.dumps(request) + '\n'
        self.serial.write(command.encode())
        
        response = self.serial.readline().decode().strip()
        return json.loads(response)
    
    def turn_on(self):
        return self.send_command("led.on")
    
    def turn_off(self):
        return self.send_command("led.off")
    
    def toggle(self):
        return self.send_command("led.toggle")
    
    def get_status(self):
        return self.send_command("led.status")

# Usage example
client = TinyMCPClient()
print(client.turn_on())    # Turn LED on
time.sleep(2)
print(client.turn_off())   # Turn LED off
```

### **Step 6: LLM Integration**

**Integrate with your preferred LLM platform:**
```python
# Example with Claude or GPT
def process_led_command(user_input):
    # Parse natural language command
    if "turn on" in user_input.lower() or "on" in user_input.lower():
        result = client.turn_on()
        return f"LED turned on: {result}"
    elif "turn off" in user_input.lower() or "off" in user_input.lower():
        result = client.turn_off()
        return f"LED turned off: {result}"
    elif "toggle" in user_input.lower() or "switch" in user_input.lower():
        result = client.toggle()
        return f"LED toggled: {result}"
    elif "status" in user_input.lower() or "state" in user_input.lower():
        result = client.get_status()
        return f"LED status: {result}"
    else:
        return "Unknown LED command"

# Example usage
user_commands = [
    "Please turn on the LED",
    "Switch off the light",
    "Toggle the LED",
    "What's the current status?"
]

for command in user_commands:
    response = process_led_command(command)
    print(f"Command: {command}")
    print(f"Response: {response}\n")
```

## Testing and Validation

### **Basic Functionality Tests**
1. **Power-on test**: Verify LED responds to basic on/off commands
2. **Communication test**: Ensure reliable serial communication
3. **Error handling**: Test invalid commands and parameter validation
4. **State persistence**: Verify state tracking across operations

### **Advanced Testing**
```go
// Automated test sequence
func runTestSequence(led *LEDController) {
    tests := []struct {
        method   string
        expected bool
    }{
        {"led.on", true},
        {"led.status", true},
        {"led.off", false},
        {"led.status", false},
        {"led.toggle", true},
        {"led.toggle", false},
    }
    
    for _, test := range tests {
        response := led.HandleCommand(test.method, nil)
        println(fmt.Sprintf("Test %s: %v", test.method, response.Success))
    }
}
```

## Performance Considerations

### **Memory Management**
- **Buffer sizes**: Optimize command buffer sizes for your use case
- **JSON parsing**: Consider lighter protocols for resource-constrained devices
- **State management**: Minimize memory usage for state tracking

### **Response Times**
- **Serial communication**: Typical response time ~10-50ms
- **Command processing**: Usually <1ms for simple LED operations
- **Network latency**: Add 50-200ms for WiFi-based communication

## Future Enhancements

The tinymcp project opens doors to numerous possibilities:

### **Hardware Expansion**
- **Multiple LEDs**: Control LED strips, matrices, or individual LEDs
- **Sensors integration**: Temperature, motion, light sensors
- **Motor control**: Servo motors, stepper motors, DC motors
- **Display integration**: LCD screens, OLED displays

### **Advanced Features**
- **PWM control**: Variable LED brightness
- **Color support**: RGB LED control
- **Pattern generation**: Blinking patterns, animations
- **Scheduling**: Time-based LED control

### **Protocol Enhancements**
- **WebSocket support**: Real-time bidirectional communication
- **MQTT integration**: IoT ecosystem integration
- **RESTful API**: HTTP-based control interface
- **Security features**: Authentication and encryption

## Conclusion

The tinymcp project demonstrates the incredible potential of combining AI language models with physical hardware. By using MCP as the communication protocol, TinyGo for efficient microcontroller programming, and Arduino for accessible hardware control, we've created a system where natural language commands can directly control physical devices.

This approach opens up new possibilities for:
- **Home automation**: Control lights, appliances, and systems via voice commands
- **Educational tools**: Teach programming and electronics through AI interaction
- **Rapid prototyping**: Quickly test hardware concepts using natural language
- **Accessibility**: Enable hardware control for users with different abilities

The intersection of AI and IoT is just beginning, and projects like tinymcp are paving the way for a future where the boundary between digital and physical worlds becomes increasingly seamless.

Whether you're a hobbyist, educator, or professional developer, the concepts and code presented here provide a solid foundation for exploring AI-controlled hardware systems. Start with a simple LED, and let your imagination guide you toward more complex and exciting applications.

---

*Ready to get started? Check out the [tinymcp repository](https://github.com/gaarutyunov/tinymcp) and begin your journey into AI-controlled hardware today!*