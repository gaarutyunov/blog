---
title: "Basic Keyboard Implementation: Matrix Scanning, USB HID, and Async Rust"
date: 2025-07-22T22:00:00+00:00
author: "German Arutyunov"
cover: ""
tags: ["rust", "embedded", "mechanical-keyboard", "firmware", "embassy", "matrix-scanning", "usb-hid", "async"]
keywords: ["rust", "embedded", "mechanical keyboard", "firmware", "matrix scanning", "usb hid", "embassy", "nrf52840", "async", "keycodes"]
description: "Dive deep into the basic implementation of mechanical keyboard firmware covering matrix scanning algorithms, USB HID communication, async programming with Embassy, and hardware pin configurations."
series: ["Building Mechanical Keyboard Firmware in Rust"]
series_index: 3
showFullContent: false
readingTime: true
hideComments: false
color: ""
---

Welcome back to our mechanical keyboard firmware series! In our [previous posts](/posts/mechanical-keyboard-firmware-part-1-setup), we've set up our development environment and explored the toolchain. Today, we'll dive into the actual implementation details of a basic keyboard firmware that demonstrates the core concepts needed to build a functional split keyboard.

In this post, we'll examine the [basic-layout branch](https://github.com/gaarutyunov/dactyl-rs/tree/basic-layout) of the dactyl-rs repository, which provides a foundational implementation of keyboard firmware in Rust using the Embassy framework.

## Implementation Overview

The basic implementation we'll explore includes:

1. **Basic functionality only**: This is not a ready-to-use solution but provides a solid foundation for testing
2. **Simple layout**: Only includes letters for the easiest testing and demonstration
3. **Dual-side operation**: Both left and right parts connect to the laptop independently
4. **No advanced features**: No BLE support, layers, or complex gestures yet
5. **USB HID only**: Focus on wired operation for simplicity

The implementation is based on the [keyboard example from Embassy](https://github.com/embassy-rs/embassy/blob/main/examples/nrf52840/src/bin/usb_hid_keyboard.rs) and incorporates insights from several excellent keyboard firmware projects:

- [keyberon](https://github.com/TeXitoi/keyberon) - A comprehensive keyboard library in Rust
- [anne-key](https://github.com/ah-/anne-key/tree/master) - Anne Pro keyboard firmware
- [key-ripper](https://github.com/bschwind/key-ripper/tree/main) - Split keyboard implementation

## Matrix Scanning Algorithm

The heart of any keyboard firmware is the matrix scanning algorithm. This technique allows us to read many keys using fewer GPIO pins by arranging keys in a grid pattern.

### How Matrix Scanning Works

Matrix scanning works by activating columns one at a time and reading all rows to detect key presses. Here's the step-by-step process:

$$
\begin{algorithm}
\caption{Matrix Scanning Algorithm}
\begin{algorithmic}
\FOR{each column $c$ in columns}
    \STATE Set column $c$ to HIGH
    \STATE Wait for voltage stabilization (10μs)
    \FOR{each row $r$ in rows}
        \IF{row $r$ is HIGH}
            \STATE Key at position $(r, c)$ is pressed
            \IF{key state changed since last scan}
                \STATE Generate key event
            \ENDIF
        \ENDIF
    \ENDFOR
    \STATE Set column $c$ to LOW
\ENDFOR
\STATE Wait scan interval (10ms)
\end{algorithmic}
\end{algorithm}
$$

### Example Key Matrix Layout

Here's an example of how the matrix scanning works with a simplified QWERTY layout. **Note: This is not the actual layout used in the implementation, but demonstrates the concept:**

| Row/Col | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 |
|---------|-------|-------|-------|-------|-------|
| **Row 0** | Q     | W     | E     | R     | T     |
| **Row 1** | A     | S     | D     | F     | G     |
| **Row 2** | Z     | X     | C     | V     | B     |

When column 2 is set HIGH and row 1 reads HIGH, we know the 'D' key is pressed.

### Implementation in Rust

The matrix scanning implementation in [`src/matrix.rs`](https://github.com/gaarutyunov/dactyl-rs/blob/basic-layout/src/matrix.rs) demonstrates how this algorithm translates to embedded Rust:

```rust
pub struct Matrix<'a, const N_COLS: usize, const N_ROWS: usize> {
    cols: [Output<'a>; N_COLS],        // Column pins as outputs
    rows: [Input<'a>; N_ROWS],         // Row pins as inputs  
    previous_state: [[bool; N_COLS]; N_ROWS], // State tracking for debouncing
}

impl<'a, const N_COLS: usize, const N_ROWS: usize> Matrix<'a, N_COLS, N_ROWS> {
    pub async fn scan_keys(&mut self) -> Option<(usize, usize)> {
        for col in 0..N_COLS {
            // Step 1: Activate column
            self.cols[col].set_high();
            
            // Step 2: Allow voltage to stabilize
            Timer::after_micros(10).await;
            
            // Step 3: Read all rows
            for row in 0..N_ROWS {
                let current_state = self.rows[row].is_high();
                let previous_state = self.previous_state[row][col];
                
                // Step 4: Detect new key press (edge detection)
                if current_state && !previous_state {
                    self.previous_state[row][col] = current_state;
                    self.cols[col].set_low();
                    return Some((row, col));
                }
                
                self.previous_state[row][col] = current_state;
            }
            
            // Step 5: Deactivate column
            self.cols[col].set_low();
        }
        
        None
    }
}
```

Key features of this implementation:

- **Const generics**: Allows compile-time specification of matrix dimensions
- **Debouncing**: Edge detection prevents multiple events for single key press
- **Async operation**: Uses Embassy's async Timer for non-blocking delays
- **State tracking**: Remembers previous scan results for change detection

## USB HID and Keyboard Reports

Understanding USB HID (Human Interface Device) is crucial for keyboard firmware. HID defines how input devices communicate with host computers.

### What is USB HID?

Based on the [USB HID specification](https://www.usb.org/sites/default/files/hid1_11.pdf), HID provides a standardized way for input devices to communicate with host systems. Key concepts include:

**HID Class Features:**
- **Self-identifying devices**: Devices describe their capabilities through descriptors
- **Standardized communication**: Common protocol for all input devices
- **Hot-pluggable**: Devices can be connected/disconnected during operation
- **Low latency**: Optimized for real-time input requirements

**Report Structure**: HID devices communicate through structured data packets called reports:
- **Input reports**: Device-to-host data (key presses)
- **Output reports**: Host-to-device data (LED status)
- **Feature reports**: Configuration and status information

### Keyboard Reports

Keyboard reports follow a specific format defined in the [HID Usage Tables](https://usb.org/sites/default/files/hut1_3_0.pdf):

```rust
#[repr(C, packed)]
pub struct KeyboardReport {
    pub modifier: u8,      // Modifier key bitmask
    pub reserved: u8,      // Reserved field (always 0)
    pub keycodes: [u8; 6], // Up to 6 simultaneous key presses
    pub leds: u8,          // LED status feedback
}
```

**Modifier byte breakdown:**
- Bit 0: Left Ctrl
- Bit 1: Left Shift  
- Bit 2: Left Alt
- Bit 3: Left GUI (Windows/Cmd)
- Bit 4: Right Ctrl
- Bit 5: Right Shift
- Bit 6: Right Alt
- Bit 7: Right GUI

### Keycodes and HID Usage IDs

The [keycode implementation](https://github.com/gaarutyunov/dactyl-rs/blob/basic-layout/src/keycodes.rs) demonstrates how to map physical keys to HID usage codes:

```rust
pub enum KeyCode {
    Base(KeyboardUsage),    // Standard HID keyboard usage codes
    Macos(MacosKeys),       // Custom macOS-specific keys
    Extra(Extra),           // Extended functionality keys
}

impl KeyCode {
    pub fn to_hid_values(&self) -> (u8, u8) {
        match self {
            KeyCode::Base(usage) => {
                let code = *usage as u8;
                if code >= 0xE0 && code <= 0xE7 {
                    // Modifier key
                    (1 << (code - 0xE0), 0)
                } else {
                    // Normal key
                    (0, code)
                }
            }
            KeyCode::Macos(MacosKeys::Fn) => (0, 0xA4), // Custom Fn key
            KeyCode::Extra(_) => (0, 0), // Future extensions
        }
    }
}
```

### USB HID Implementation

The [`src/usb.rs`](https://github.com/gaarutyunov/dactyl-rs/blob/basic-layout/src/usb.rs) file shows how to integrate with the [usbd-hid](https://github.com/twitchyliquid64/usbd-hid/tree/master) library:

```rust
pub struct UsbKeyboard<'d, D: embassy_usb::driver::Driver<'d>, const N: usize> {
    writer: HidWriter<'d, D, N>,
    configured: &'d AtomicBool,
}

impl<'d, D: embassy_usb::driver::Driver<'d>, const N: usize> UsbKeyboard<'d, D, N> {
    pub async fn send_key_report(&mut self, keycode: KeyCode) {
        if !self.configured.load(Ordering::Relaxed) {
            return; // USB not configured, ignore
        }
        
        let (modifier, normal_key) = keycode.to_hid_values();
        
        let report = KeyboardReport {
            modifier,
            reserved: 0,
            keycodes: if normal_key != 0 { [normal_key, 0, 0, 0, 0, 0] } else { [0; 6] },
            leds: 0,
        };
        
        // Send key press
        let _ = self.writer.write_serialize(&report).await;
        
        // Auto-release after 10ms to prevent stuck keys
        Timer::after_millis(10).await;
        let release_report = KeyboardReport::default();
        let _ = self.writer.write_serialize(&release_report).await;
    }
}
```

## Asynchronous Programming with Embassy

Embassy brings modern async/await programming to embedded systems, making it much easier to handle concurrent operations like matrix scanning, USB communication, and power management.

### Why Async for Keyboards?

Traditional keyboard firmware often uses interrupt-driven state machines or polling loops. Embassy's async approach offers several advantages:

- **Simplified concurrency**: Handle multiple tasks without complex interrupt handlers
- **Power efficiency**: Tasks can yield during waits, allowing power saving
- **Composability**: Easy to combine different async operations
- **Familiar syntax**: Developers can use standard Rust async patterns

For more background on async embedded programming, these videos provide excellent starting points:
- [Async Rust in embedded systems](https://youtu.be/wni5h5vIPhU?si=SXu_L-YOOb1WIXKH)
- [Embassy: async/await for embedded](https://youtu.be/TOAynddiu5M?si=TWkosDxP4fzihIqu)

### Core Embassy Concepts Used

The implementation leverages several key Embassy primitives:

**Futures**: Async operations that can be awaited
```rust
// Wait without blocking other tasks
Timer::after_millis(10).await;
```

**Signals**: Cross-task communication mechanism
```rust
static WAKEUP_SIGNAL: Signal<NoopRawMutex, ()> = Signal::new();

// In one task
WAKEUP_SIGNAL.signal(());

// In another task  
WAKEUP_SIGNAL.wait().await;
```

**Channels**: Message passing between tasks
```rust
static CHANNEL: Channel<NoopRawMutex, (usize, usize), 16> = Channel::new();

// Matrix scanner sends key events
CHANNEL.sender().send((row, col)).await;

// Keyboard task receives events
let (row, col) = CHANNEL.receiver().receive().await;
```

**Atomics**: Thread-safe shared state
```rust
static USB_CONFIGURED: AtomicBool = AtomicBool::new(false);

// Check configuration status from any task
if USB_CONFIGURED.load(Ordering::Relaxed) {
    // USB is ready for communication
}
```

### Task Structure

Both left and right keyboard implementations use the same four-task architecture:

1. **USB Task**: Handles enumeration and power management
2. **Matrix Scanner**: Continuously scans for key presses  
3. **Keyboard Task**: Processes key events and sends USB reports
4. **USB Reader**: Handles incoming HID requests

```rust
#[embassy_executor::main]
async fn main(spawner: Spawner) {
    // Hardware initialization
    let p = embassy_nrf::init(Default::default());
    
    // Spawn concurrent tasks
    spawner.spawn(usb_task(/* ... */)).unwrap();
    spawner.spawn(matrix_task(/* ... */)).unwrap(); 
    spawner.spawn(keyboard_task(/* ... */)).unwrap();
    spawner.spawn(usb_reader_task(/* ... */)).unwrap();
}
```

This concurrent design ensures:
- **Responsive key scanning**: Matrix scanning never blocks
- **Reliable USB communication**: USB stack gets dedicated processing time
- **Proper power management**: Suspend/resume handled independently
- **Clean separation**: Each task has a single responsibility

## nRFMicro Pin Mapping

The implementation uses the [nRFMicro](https://github.com/joric/nrfmicro/wiki/Pinout) development board, which provides an nRF52840-based replacement for Pro Micro boards.

### Left Keyboard Pin Configuration

Based on the [`src/left.rs`](https://github.com/gaarutyunov/dactyl-rs/blob/basic-layout/src/left.rs) implementation:

| Function | nRF52 Pin | nRFMicro Pin | Configuration |
|----------|-----------|--------------|---------------|
| **Columns (Outputs)** | | | |
| Col 0 | P0.31 | 31 | Output, Low, Standard Drive |
| Col 1 | P0.29 | 29 | Output, Low, Standard Drive |
| Col 2 | P0.02 | 2 | Output, Low, Standard Drive |
| Col 3 | P1.13 | 45 | Output, Low, Standard Drive |
| Col 4 | P0.03 | 3 | Output, Low, Standard Drive |
| Col 5 | P0.28 | 28 | Output, Low, Standard Drive |
| Col 6 | P1.11 | 43 | Output, Low, Standard Drive |
| **Rows (Inputs)** | | | |
| Row 0 | P0.20 | 20 | Input, Pull-Down |
| Row 1 | P0.13 | 13 | Input, Pull-Down |
| Row 2 | P0.24 | 24 | Input, Pull-Down |
| Row 3 | P0.09 | 9 | Input, Pull-Down |
| Row 4 | P0.10 | 10 | Input, Pull-Down |
| Row 5 | P1.06 | 38 | Input, Pull-Down |

### Right Keyboard Pin Configuration  

The [`src/right.rs`](https://github.com/gaarutyunov/dactyl-rs/blob/basic-layout/src/right.rs) implementation uses identical pin assignments:

| Function | nRF52 Pin | nRFMicro Pin | Configuration |
|----------|-----------|--------------|---------------|
| **Columns (Outputs)** | | | |
| Col 0 | P0.31 | 31 | Output, Low, Standard Drive |
| Col 1 | P0.29 | 29 | Output, Low, Standard Drive |
| Col 2 | P0.02 | 2 | Output, Low, Standard Drive |
| Col 3 | P1.13 | 45 | Output, Low, Standard Drive |
| Col 4 | P0.03 | 3 | Output, Low, Standard Drive |
| Col 5 | P0.28 | 28 | Output, Low, Standard Drive |
| Col 6 | P1.11 | 43 | Output, Low, Standard Drive |
| **Rows (Inputs)** | | | |
| Row 0 | P0.20 | 20 | Input, Pull-Down |
| Row 1 | P0.13 | 13 | Input, Pull-Down |
| Row 2 | P0.24 | 24 | Input, Pull-Down |
| Row 3 | P0.09 | 9 | Input, Pull-Down |
| Row 4 | P0.10 | 10 | Input, Pull-Down |
| Row 5 | P1.06 | 38 | Input, Pull-Down |

### Key Layout Implementation

The basic layouts are intentionally simple for testing:

**Left Side Layout:**
```
Q  W  E  R  T
A  S  D  F  G
Z  X  C  V  B
```

**Right Side Layout:**  
```
Y  U  I  O  P
H  J  K  L
N  M  ,  .  /
```

Each side operates as an independent USB HID device with identical pin configurations but different key mappings.

## Implementation Architecture

### Independent Operation

A key design decision in this basic implementation is that both halves operate independently:

- **Separate USB devices**: Each half appears as its own keyboard to the host
- **No inter-half communication**: Sides don't communicate with each other
- **Identical firmware**: Same codebase with different layout functions
- **Simple debugging**: Each half can be developed and tested independently

### USB Device Configuration

Both keyboards share identical USB descriptors:

```rust
// USB Device Configuration
vendor_id: 0xc0de
product_id: 0xcafe  
manufacturer: "German Arutyunov"
product: "Dactyal Manuform"
max_power: 100mA
poll_interval: 60ms
```

### Power Management

The implementation includes proper USB power management:

- **Suspend support**: Reduces power consumption when host suspends
- **Remote wakeup**: Can wake the host system from suspend on key press
- **Current limiting**: Respects USB power constraints (100mA max)

## Future Work

This basic implementation provides the foundation for more advanced features that will be covered in future posts:

### Bluetooth Low Energy Support

The next post will explore adding BLE connectivity to create a truly wireless split keyboard:

- **Wireless protocol**: Nordic SoftDevice for BLE communication
- **Power optimization**: Sleep modes and connection interval tuning
- **Pairing management**: Secure device pairing and bonding
- **Battery monitoring**: Track and report battery status

### Advanced Keyboard Features  

Additional functionality planned for future implementations:

**Layer Support**: Multiple key layers accessed via layer keys
- **Base layer**: Standard QWERTY layout
- **Function layer**: F-keys, media controls, navigation
- **Symbol layer**: Programming symbols and special characters

**Complex Gestures**: Advanced key combinations
- **Hold + Press**: Different actions for tap vs hold
- **Key sequences**: Multi-key combinations and macros
- **Timing-sensitive**: Different behaviors based on timing

**Configuration Interface**: User-friendly customization
- **Layout Editor**: Visual key mapping interface using [Yew](https://github.com/yewstack/yew)
- **Real-time updates**: Change layouts without reflashing firmware
- **Profile management**: Multiple saved configurations

### Layout Editor in Rust

An exciting future direction is developing a pure Rust layout editor using the Yew framework:

- **WebAssembly target**: Run layout editor in the browser
- **Visual interface**: Drag-and-drop key assignment
- **Real-time preview**: See changes immediately  
- **Cross-platform**: Works on any device with a web browser
- **Rust ecosystem**: Leverage existing keyboard firmware types and validation

## Resources and References

Understanding the complete ecosystem helps in further development:

- [Embassy Book](https://embassy.dev/book/) - Comprehensive async embedded development guide
- [USB HID Specification](https://www.usb.org/sites/default/files/hid1_11.pdf) - Official HID specification
- [HID Usage Tables](https://usb.org/sites/default/files/hut1_3_0.pdf) - Keycode definitions and usage IDs
- [usbd-hid Repository](https://github.com/twitchyliquid64/usbd-hid/tree/master) - Rust USB HID implementation library
- [keyberon](https://github.com/TeXitoi/keyberon) - Comprehensive keyboard firmware library
- [nRFMicro Wiki](https://github.com/joric/nrfmicro/wiki/Pinout) - Hardware pinout and documentation
- [dactyl-rs Repository](https://github.com/gaarutyunov/dactyl-rs/tree/basic-layout) - Complete implementation source
- [Async Rust Videos](https://youtu.be/wni5h5vIPhU?si=SXu_L-YOOb1WIXKH) - Background on async embedded programming
- [Embassy Introduction](https://youtu.be/TOAynddiu5M?si=TWkosDxP4fzihIqu) - Getting started with Embassy framework

## Conclusion

This exploration of the basic keyboard implementation reveals the sophisticated engineering required for even a "simple" keyboard firmware. The combination of:

- **Efficient matrix scanning** with proper debouncing and timing
- **Standards-compliant USB HID** communication with proper report structures  
- **Modern async programming** enabling clean concurrent task management
- **Careful hardware integration** with precise pin configurations

Creates a solid foundation for building more advanced keyboard features.

The Embassy framework's async/await model proves particularly well-suited for keyboard firmware, where we need to handle multiple concurrent operations (matrix scanning, USB communication, power management) while maintaining real-time responsiveness.

While this implementation lacks advanced features like BLE connectivity, layers, and complex gestures, it demonstrates all the core concepts needed to build a functional split keyboard. The clean separation between hardware abstraction, matrix scanning, and USB communication provides a maintainable architecture for future enhancements.

In our next post, we'll extend this foundation to add Bluetooth Low Energy support, transforming our wired split keyboard into a fully wireless solution with proper power management and connection handling.

---

*This post is part of a series on building mechanical keyboard firmware in Rust. Follow along as we explore the complete journey from setup to advanced features.*