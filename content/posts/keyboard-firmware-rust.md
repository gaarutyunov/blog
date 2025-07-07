---
title: "Writing Keyboard Firmware from Scratch in Rust"
date: 2025-07-07T22:56:00+00:00
author: "German Arutyunov"
cover: ""
tags: ["rust", "firmware", "keyboard", "embedded", "nrf", "ble"]
keywords: ["keyboard firmware", "rust", "nrf", "ble", "embedded", "keyberon", "rmk"]
description: "A comprehensive guide to writing keyboard firmware from scratch in Rust, covering architecture, components, and implementation for nRF microcontrollers with BLE support."
showFullContent: false
readingTime: true
hideComments: false
color: ""
---

Building a custom keyboard firmware from scratch is an exciting journey that combines hardware knowledge, embedded programming, and systems design. This guide explores how to create keyboard firmware in Rust, specifically targeting nRF microcontrollers with BLE support for split keyboards.

## Understanding Keyboard Firmware Architecture

Keyboard firmware serves as the bridge between physical key presses and the digital world. At its core, it must handle matrix scanning, debouncing, key event processing, and communication with the host device.

### Core Components

Modern keyboard firmware consists of several interconnected components:

1. **Matrix Scanner** - Detects physical key presses by scanning the electrical matrix
2. **Debouncer** - Filters out mechanical switch bounce to ensure clean key events
3. **Layout Manager** - Maps physical keys to logical actions and handles layers
4. **Communication Layer** - Handles USB HID or BLE communication with the host
5. **Action Processor** - Executes key actions, macros, and advanced features

## Matrix Scanning: The Foundation

Matrix scanning is the fundamental operation that detects which keys are pressed. Most keyboards use a row-column matrix to minimize the number of required pins.

### Basic Matrix Scanning Algorithm

```rust
pub struct Matrix<const ROWS: usize, const COLS: usize> {
    rows: [Pin<Output<PushPull>>; ROWS],
    cols: [Pin<Input<PullUp>>; COLS],
    states: [[bool; COLS]; ROWS],
}

impl<const ROWS: usize, const COLS: usize> Matrix<ROWS, COLS> {
    pub fn scan(&mut self) -> [[bool; COLS]; ROWS] {
        let mut current_states = [[false; COLS]; ROWS];
        
        for (row_idx, row_pin) in self.rows.iter_mut().enumerate() {
            // Pull row low
            row_pin.set_low().ok();
            
            // Small delay for signal to stabilize
            delay_us(1);
            
            // Read all columns
            for (col_idx, col_pin) in self.cols.iter().enumerate() {
                // If column is low while row is low, key is pressed
                current_states[row_idx][col_idx] = col_pin.is_low().unwrap_or(false);
            }
            
            // Return row to high impedance
            row_pin.set_high().ok();
        }
        
        current_states
    }
}
```

*Reference: Matrix scanning patterns inspired by [keyberon](https://github.com/TeXitoi/keyberon) matrix implementation*

## Debouncing: Ensuring Clean Key Events

Mechanical switches exhibit "bounce" - rapid on/off transitions when pressed or released. Debouncing eliminates these false signals.

### Simple Debouncing Implementation

```rust
pub struct Debouncer {
    debounce_time_ms: u32,
    last_change_time: [[u32; COLS]; ROWS],
    stable_state: [[bool; COLS]; ROWS],
}

impl Debouncer {
    pub fn update(&mut self, current_state: [[bool; COLS]; ROWS], current_time: u32) -> Vec<KeyEvent> {
        let mut events = Vec::new();
        
        for row in 0..ROWS {
            for col in 0..COLS {
                let current = current_state[row][col];
                let stable = self.stable_state[row][col];
                
                if current != stable {
                    // State change detected
                    if current_time - self.last_change_time[row][col] >= self.debounce_time_ms {
                        // Debounce time elapsed, accept the change
                        self.stable_state[row][col] = current;
                        events.push(KeyEvent {
                            row,
                            col,
                            pressed: current,
                        });
                    }
                    self.last_change_time[row][col] = current_time;
                }
            }
        }
        
        events
    }
}
```

*Reference: Debouncing approach based on [keyberon](https://github.com/TeXitoi/keyberon) debouncer module*

## Key Dependencies for nRF Development

For nRF microcontroller development with BLE support, you'll need these essential crates:

### Core Dependencies

```toml
[dependencies]
# Hardware abstraction
embassy-nrf = "0.1.0"
embassy-executor = "0.5.0"
embassy-time = "0.3.0"
embassy-usb = "0.1.0"

# BLE stack
trouble-host = "0.1.0"
bt-hci = "0.1.0"
nrf-sdc = "0.1.0"

# Collections and utilities
heapless = "0.8"
embedded-hal = "1.0"
static_cell = "2.0"

# Storage
sequential-storage = "3.0"
```

*Reference: Dependency patterns from [RMK](https://github.com/HaoboGu/rmk) keyboard firmware*

### BLE Support Architecture

BLE implementation requires careful consideration of the Bluetooth stack, connection management, and power optimization.

```rust
use trouble_host::prelude::*;

pub struct BleKeyboard {
    stack: Stack<'static>,
    connection: Option<Connection>,
    hid_service: HidService,
}

impl BleKeyboard {
    pub async fn new() -> Self {
        let stack = Stack::new();
        let hid_service = HidService::new();
        
        Self {
            stack,
            connection: None,
            hid_service,
        }
    }
    
    pub async fn advertise(&mut self) {
        let mut adv_data = [0u8; 31];
        let mut scan_data = [0u8; 31];
        
        // Set up advertising data with HID service UUID
        AdStructure::ServiceUuids16(&[HID_SERVICE_UUID])
            .encode(&mut adv_data);
        
        self.stack.advertise(
            &adv_data,
            &scan_data,
            &AdvertisingParameters::default(),
        ).await;
    }
    
    pub async fn send_key_report(&mut self, report: &KeyboardReport) {
        if let Some(conn) = &self.connection {
            self.hid_service.send_report(conn, report).await;
        }
    }
}
```

*Reference: BLE implementation patterns from [RMK](https://github.com/HaoboGu/rmk) BLE module*

## Main Loop Architecture

The main firmware loop coordinates all components using an async architecture:

```rust
#[embassy_executor::main]
async fn main(_spawner: Spawner) -> ! {
    let mut matrix = Matrix::new(row_pins, col_pins);
    let mut debouncer = Debouncer::new(5); // 5ms debounce
    let mut ble_keyboard = BleKeyboard::new().await;
    let mut layout = Layout::new();
    
    // Start BLE advertising
    ble_keyboard.advertise().await;
    
    // Main keyboard loop
    loop {
        // Scan matrix for changes
        let current_state = matrix.scan();
        
        // Process through debouncer
        let events = debouncer.update(current_state, get_current_time());
        
        // Process events through layout
        for event in events {
            if let Some(report) = layout.process_event(event) {
                ble_keyboard.send_key_report(&report).await;
            }
        }
        
        // Sleep briefly to avoid excessive CPU usage
        Timer::after_millis(1).await;
    }
}
```

## Split Keyboard Considerations

Split keyboards require communication between the two halves. For BLE-enabled splits, you have several options:

1. **Master-Slave Architecture**: One half connects to the host, the other connects to the master
2. **Dual Connection**: Both halves connect independently to the host
3. **Wired Connection**: Use UART or I2C between halves, with one handling BLE

### Inter-Half Communication

```rust
pub struct SplitCommunication {
    uart: Uart<'static, UARTE0>,
    is_master: bool,
}

impl SplitCommunication {
    pub async fn send_events(&mut self, events: &[KeyEvent]) {
        let serialized = serialize_events(events);
        self.uart.write(&serialized).await.ok();
    }
    
    pub async fn receive_events(&mut self) -> Option<Vec<KeyEvent>> {
        let mut buffer = [0u8; 64];
        if let Ok(len) = self.uart.read(&mut buffer).await {
            deserialize_events(&buffer[..len])
        } else {
            None
        }
    }
}
```

## Power Management for Battery Operation

Battery-powered keyboards require careful power management:

```rust
pub struct PowerManager {
    adc: Adc<'static, SAADC>,
    battery_pin: Pin<Input<Floating>>,
    power_state: PowerState,
}

impl PowerManager {
    pub async fn check_battery_level(&mut self) -> u8 {
        let reading = self.adc.read(&mut self.battery_pin).await;
        voltage_to_percentage(reading)
    }
    
    pub async fn enter_deep_sleep(&mut self) {
        // Configure wake sources (key matrix)
        // Enter deep sleep mode
        cortex_m::asm::wfi();
    }
}
```

## Advanced Features

### Layer System

```rust
pub struct Layout {
    layers: [[[KeyCode; COLS]; ROWS]; LAYERS],
    current_layer: usize,
    layer_state: u32,
}

impl Layout {
    pub fn process_event(&mut self, event: KeyEvent) -> Option<KeyboardReport> {
        let keycode = self.layers[self.current_layer][event.row][event.col];
        
        match keycode {
            KeyCode::Key(hid_code) => {
                // Standard key press
                Some(KeyboardReport::from_key(hid_code, event.pressed))
            }
            KeyCode::Layer(layer) => {
                // Layer activation
                self.activate_layer(layer, event.pressed);
                None
            }
            KeyCode::Transparent => {
                // Fall through to lower layer
                self.process_transparent_key(event)
            }
        }
    }
}
```

*Reference: Layer management concepts from [keyberon](https://github.com/TeXitoi/keyberon) layout system*

## Getting Started: Essential Steps

1. **Set up the development environment** with Rust and Embassy
2. **Initialize the nRF project** with proper memory configuration
3. **Implement basic matrix scanning** without advanced features
4. **Add simple debouncing** with fixed timing
5. **Create USB HID communication** for initial testing
6. **Implement BLE stack** using trouble-host
7. **Add power management** for battery operation
8. **Implement split communication** if needed

## Conclusion

Writing keyboard firmware from scratch in Rust provides excellent control over every aspect of the keyboard's behavior. The combination of Rust's safety guarantees, the rich embedded ecosystem, and powerful BLE stacks makes it an ideal choice for modern keyboard development.

The architecture outlined here provides a solid foundation for building sophisticated keyboard firmware with BLE support on nRF microcontrollers. Start with the basic matrix scanning and gradually add features like layers, macros, and advanced BLE functionality.

## References

- [Keyberon](https://github.com/TeXitoi/keyberon) - A pure Rust keyboard firmware framework
- [RMK](https://github.com/HaoboGu/rmk) - Feature-rich keyboard firmware with BLE support
- [Embassy](https://embassy.dev/) - Modern embedded framework for Rust
- [Trouble](https://github.com/embassy-rs/trouble) - Pure Rust BLE stack
- [nRF Connect SDK](https://www.nordicsemi.com/Products/Development-software/nRF-Connect-SDK) - Nordic's official development framework

This guide provides the foundation for creating your own keyboard firmware. Remember to start simple with basic key scanning and gradually add complexity as you become comfortable with the embedded development workflow.