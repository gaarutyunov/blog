---
title: "Development Tools and Hardware Deep Dive for Mechanical Keyboard Firmware"
date: 2025-07-21T22:00:00+00:00
author: "German Arutyunov"
cover: ""
tags: ["rust", "embedded", "mechanical-keyboard", "firmware", "embassy", "probe-rs", "debugging", "nrf52840"]
keywords: ["rust", "embedded", "mechanical keyboard", "firmware", "probe-rs", "debug probe", "cargo-make", "uf2", "bootloader", "nrfmicro"]
description: "Explore the comprehensive toolchain for mechanical keyboard firmware development in Rust, from build automation to professional debugging tools and hardware configuration."
series: ["Building Mechanical Keyboard Firmware in Rust"]
series_index: 2
showFullContent: false
readingTime: true
hideComments: false
color: ""
---

Welcome back to our series on building mechanical keyboard firmware in Rust! In our [first post](/posts/mechanical-keyboard-firmware-part-1-setup), we set up our development environment and explored the frameworks we'll be using. Today, we're diving deep into the practical side: understanding the complete toolchain, exploring our target hardware, and building our first firmware with proper debugging support.

## The Complete Development Toolchain

Modern embedded Rust development has evolved significantly, providing us with professional-grade tools that rival traditional embedded development environments. Let's explore each component of our toolchain and understand how they work together.

### Build Automation with Cargo-Make

**cargo-make** is a powerful task runner that extends Cargo's capabilities with complex build workflows. For embedded development, where we need to compile, convert formats, and deploy firmware, cargo-make becomes essential.

```toml
# Makefile.toml - Build automation configuration
[config]
default_to_workspace = false

[env]
CARGO_MAKE_EXTEND_WORKSPACE_MAKEFILE = true

[tasks.install-tools]
description = "Install required embedded development tools"
script = [
    "rustup target add thumbv7em-none-eabihf",
    "cargo install probe-rs-tools",
    "cargo install cargo-binutils",
    "cargo install hex-to-uf2"
]

[tasks.build-release]
description = "Build firmware in release mode"
command = "cargo"
args = ["build", "--release", "--bin", "firmware"]

[tasks.objcopy]
description = "Convert ELF to Intel HEX format"
command = "cargo"
args = ["objcopy", "--release", "--bin", "firmware", "--", "-O", "ihex", "firmware.hex"]
dependencies = ["build-release"]

[tasks.uf2]
description = "Convert HEX to UF2 for drag-and-drop flashing"
command = "hex-to-uf2"
args = ["--input-path", "target/thumbv7em-none-eabihf/release/firmware.hex", 
        "--output-path", "firmware.uf2", "--family", "nrf52840"]
dependencies = ["objcopy"]

[tasks.flash]
description = "Flash firmware using probe-rs"
command = "probe-rs"
args = ["run", "--chip", "nRF52840_xxAA", "target/thumbv7em-none-eabihf/release/firmware"]
dependencies = ["build-release"]

[tasks.deploy]
description = "Complete build and deploy workflow"
dependencies = ["uf2"]
```

This configuration automates our entire build process:
1. **Tool Installation**: Ensures all required tools are available
2. **Compilation**: Builds the firmware for our ARM Cortex-M4 target
3. **Format Conversion**: Converts from ELF to HEX to UF2 formats
4. **Deployment**: Provides both probe-based flashing and drag-and-drop options

### From HEX to UF2: Universal Firmware Format

The **UF2 (USB Flashing Format)** represents a significant advancement in embedded firmware deployment. Instead of requiring specialized programming software, users can simply drag and drop firmware files onto a USB drive.

The **hex-to-uf2** crate provides pure Rust conversion functionality:

```rust
// Basic usage of hex-to-uf2 library
use hex_to_uf2::{hex_to_uf2_file, Family};

fn convert_firmware() -> Result<(), Box<dyn std::error::Error>> {
    hex_to_uf2_file(
        Path::new("./firmware.hex"),
        Path::new("./firmware.uf2"),
        Some(Family::NRF52840), // Specify target family
    )?;
    Ok(())
}
```

The magic happens in the UF2 format structure:
- **Block-based**: 512-byte blocks for compatibility with various filesystems
- **Self-describing**: Contains target information and memory layout
- **Bootloader-friendly**: Designed for simple implementation in bootloaders
- **Error-resistant**: Built-in checksums and validation

## Professional Debugging with Probe-RS

**probe-rs** has revolutionized embedded Rust debugging by providing a modern, pure-Rust alternative to proprietary debugging tools. It supports multiple probe types and offers features that rival expensive commercial solutions.

### Key Capabilities

1. **Multi-probe Support**: Works with J-Link, CMSIS-DAP, ST-Link, and other probes
2. **Real-Time Transfer (RTT)**: Printf-style debugging without UART overhead
3. **GDB Integration**: Compatible with existing debugger workflows
4. **Flash Programming**: Built-in flash programming capabilities

### RTT: Game-Changing Debug Output

RTT (Real-Time Transfer) provides bidirectional communication between your firmware and host computer with minimal overhead:

```rust
// firmware/src/main.rs - RTT logging setup
use defmt_rtt as _; // global logger
use panic_probe as _; // panic handler

#[defmt::info]
fn log_key_press(key: u8, row: u8, col: u8) {
    defmt::info!("Key pressed: {} at position ({}, {})", key, row, col);
}

#[defmt::warn] 
fn log_battery_low(voltage: f32) {
    defmt::warn!("Battery voltage low: {:.2}V", voltage);
}
```

RTT provides several advantages over traditional UART debugging:
- **No GPIO pins required**: Uses debug interface
- **High bandwidth**: Suitable for high-frequency logging
- **Minimal overhead**: Designed for real-time systems
- **Bidirectional**: Can receive commands from host

### Setting Up probe-rs

```bash
# Install probe-rs tools
cargo install probe-rs-tools

# List connected probes
probe-rs list

# Flash firmware
probe-rs run --chip nRF52840_xxAA firmware.elf

# Monitor RTT output
probe-rs rtt --chip nRF52840_xxAA
```

## Visual Studio Code Integration

The **probe-rs VS Code extension** brings desktop-class debugging to embedded development. This integration provides:

### Features
- **Native debugging interface** with breakpoints and variable inspection
- **Integrated RTT console** for real-time logging
- **Memory and register viewers** for low-level debugging
- **Multi-target support** for different microcontrollers

### Configuration

Create `.vscode/launch.json` for your project:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "probe-rs-debug",
            "request": "launch",
            "name": "Debug nRF52840 Keyboard",
            "chip": "nRF52840_xxAA",
            "program": "${workspaceFolder}/target/thumbv7em-none-eabihf/debug/firmware",
            "svdFile": "${workspaceFolder}/nrf52840.svd",
            "rttEnabled": true,
            "rttChannelFormats": [
                {
                    "channelNumber": 0,
                    "dataFormat": "Defmt",
                    "showTimestamps": true
                }
            ]
        }
    ]
}
```

This configuration enables:
- **Full debugging support** with breakpoints and stepping
- **RTT integration** with defmt formatting
- **SVD file support** for peripheral register viewing
- **Timestamps** for performance analysis

## The Raspberry Pi Debug Probe

The **Raspberry Pi Debug Probe** democratizes access to professional embedded debugging tools. Based on the RP2040 microcontroller, it provides CMSIS-DAP compatible debugging at an affordable price point.

### Key Features
- **CMSIS-DAP v1.2 and v2.0 compatible**
- **SWD and JTAG support** for ARM and RISC-V targets
- **UART bridging** for additional serial communication
- **Open-source design** allowing customization and modifications
- **Cost-effective** alternative to proprietary solutions

### Hardware Specifications
- **Connector**: 3-pin JST-SH for SWD connection
- **UART**: Separate 3-pin JST-SH for serial communication
- **LEDs**: Status indicators for power and debug activity
- **USB-C**: Host connection with integrated USB hub functionality

### Connection Example

```
Debug Probe          nRFMicro
-----------          --------
SWDIO    ----------- SWDIO (P0.18)
SWCLK    ----------- SWCLK (P0.16)  
GND      ----------- GND
3V3      ----------- VCC (optional)
```

## nRFMicro: Purpose-Built Wireless Controller

The **nRFMicro** represents the evolution of keyboard controllers, combining the nRF52840's powerful capabilities with the familiar Pro Micro form factor. Let's explore its pinout and capabilities in detail.

### nRFMicro Pinout Reference

| Pin | nRF52840 GPIO | Function | Description |
|-----|--------------|----------|-------------|
| RAW | - | Power Input | Battery/USB power input |
| GND | - | Ground | Ground connection |
| RST | P0.18 | Reset | Reset pin (active low) |
| VCC | - | 3.3V Output | Regulated 3.3V output |
| P0.02 | P0.02 | GPIO/AIN0 | Analog input capable |
| P0.29 | P0.29 | GPIO/AIN5 | Analog input capable |
| P0.03 | P0.03 | GPIO/AIN1 | Analog input capable |
| P0.28 | P0.28 | GPIO/AIN4 | Analog input capable |
| P0.04 | P0.04 | GPIO/AIN2 | Analog input capable |
| P0.05 | P0.05 | GPIO/AIN3 | Analog input capable |
| P0.30 | P0.30 | GPIO/AIN6 | Analog input capable |
| P0.06 | P0.06 | GPIO | General purpose I/O |
| P0.08 | P0.08 | GPIO | General purpose I/O |
| P0.17 | P0.17 | GPIO | General purpose I/O |
| P0.20 | P0.20 | GPIO | General purpose I/O |
| P0.13 | P0.13 | GPIO | General purpose I/O |
| P0.24 | P0.24 | GPIO | General purpose I/O |
| P0.09 | P0.09 | GPIO/NFC1 | Can be configured as GPIO |
| P0.10 | P0.10 | GPIO/NFC2 | Can be configured as GPIO |
| P1.06 | P1.06 | GPIO | General purpose I/O |
| P1.04 | P1.04 | GPIO | General purpose I/O |
| P0.11 | P0.11 | GPIO | General purpose I/O |
| P1.00 | P1.00 | GPIO | General purpose I/O |
| P0.12 | P0.12 | GPIO | General purpose I/O |
| P0.07 | P0.07 | GPIO | General purpose I/O |

### Special Function Pins

The nRF52840 provides additional functionality on specific pins:

```rust
// Example pin configuration for keyboard matrix
use embassy_nrf::gpio::{Level, Output, OutputDrive, Input, Pull};

// Configure row pins as outputs (driving)
let row_pins = [
    Output::new(p0_02, Level::Low, OutputDrive::Standard),
    Output::new(p0_03, Level::Low, OutputDrive::Standard),
    Output::new(p0_04, Level::Low, OutputDrive::Standard),
    Output::new(p0_05, Level::Low, OutputDrive::Standard),
];

// Configure column pins as inputs with pull-up resistors
let col_pins = [
    Input::new(p0_06, Pull::Up),
    Input::new(p0_08, Pull::Up),  
    Input::new(p0_17, Pull::Up),
    Input::new(p0_20, Pull::Up),
    Input::new(p0_13, Pull::Up),
    Input::new(p0_24, Pull::Up),
];
```

## Understanding the UF2 Bootloader

The **Adafruit nRF52 Bootloader** provides the foundation for easy firmware updates. Understanding its operation modes and capabilities is crucial for keyboard development.

### Bootloader Entry Modes

The bootloader supports multiple entry methods for different scenarios:

1. **Double Reset Button** (DFU with UF2 - nRF52840 only):
   - Press reset button twice quickly
   - Enters DFU mode with USB Mass Storage support
   - Drag and drop UF2 files for flashing

2. **Pin Combination** (DFU=LOW, FRST=HIGH):
   - Bootloader mode with UF2 and CDC support
   - Useful for automated testing and development

3. **OTA Mode** (DFU=LOW, FRST=LOW):
   - Over-the-air update capability
   - Bluetooth-based firmware updates

4. **Application Mode** (DFU=HIGH, FRST=HIGH):
   - Normal application execution
   - Falls back to DFU if no valid application

### Memory Layout Configuration

The bootloader requires specific memory layout configuration in your firmware:

```rust
// memory.x - Memory layout for Adafruit bootloader compatibility
MEMORY
{
  /* NOTE 1 K = 1 KiBi = 1024 bytes */
  /* Bootloader occupies first 48KB */
  FLASH : ORIGIN = 0x00000000 + 48K, LENGTH = 1024K - 48K
  RAM : ORIGIN = 0x20000000, LENGTH = 256K
}
```

### Cargo Configuration

```toml
# .cargo/config.toml - Target configuration
[build]
target = "thumbv7em-none-eabihf"

[target.thumbv7em-none-eabihf]
rustflags = [
  "-C", "linker=flip-link",
  "-C", "link-arg=-Tlink.x",
  "-C", "link-arg=-Tdefmt.x",
]
```

## Practical Example: The Dactyl-RS Implementation

Let's examine how all these tools come together in a real keyboard firmware project. The **dactyl-rs** repository demonstrates best practices for wireless keyboard development.

### Project Structure

```
dactyl-rs/
├── Cargo.toml              # Dependencies and project configuration
├── Makefile.toml          # Build automation with cargo-make
├── memory.x               # Memory layout for bootloader compatibility
├── src/
│   ├── main.rs           # Main application entry point
│   ├── keyboard.rs       # Keyboard matrix and HID implementation
│   ├── bluetooth.rs      # BLE stack integration
│   └── battery.rs        # Power management
├── .cargo/
│   └── config.toml       # Target-specific build configuration
└── .vscode/
    └── launch.json       # Debugging configuration
```

### Key Dependencies

```toml
# Cargo.toml - Essential dependencies for wireless keyboard
[dependencies]
embassy-executor = { version = "0.6.3", features = ["defmt", "integrated-timers"] }
embassy-nrf = { version = "0.3.1", features = [
    "nrf52840", "time-driver-rtc1", "gpiote", 
    "unstable-pac", "nfc-pins-as-gpio", "time"
] }
embassy-usb = { version = "0.3.0", features = ["defmt"] }
embassy-futures = "0.1.1"

# BLE stack
nrf-sdc = { version = "0.1.0", features = [
    "defmt", "peripheral", "central", "nrf52840"
] }
bt-hci = { version = "0.1.0", features = ["defmt"] }

# Logging and debugging
defmt = "0.3.8"
defmt-rtt = "0.4.1"
panic-probe = "0.3.2"

# Utilities
heapless = "0.8.0"
nb = "1.1.0"
```

### Build Automation

The build process demonstrates the complete toolchain integration:

```bash
# Using cargo-make for complete build workflow
cargo make install-tools    # Install required tools
cargo make build-release    # Compile firmware
cargo make uf2             # Convert to UF2 format
cargo make flash           # Flash via probe-rs (development)
```

## Development Workflow Integration

Here's how all these tools integrate into a efficient development workflow:

### 1. Development Phase
- **VS Code** with probe-rs extension for coding and debugging
- **RTT logging** for real-time diagnostics
- **Breakpoint debugging** for complex logic issues

### 2. Build Phase  
- **cargo-make** automates the entire build process
- **Automatic tool installation** ensures consistency
- **Multi-format output** (ELF, HEX, UF2) for different deployment needs

### 3. Testing Phase
- **Debug probe** enables hardware-in-the-loop testing
- **RTT output** provides detailed execution logging  
- **GDB integration** for advanced debugging scenarios

### 4. Deployment Phase
- **UF2 format** for end-user firmware updates
- **Drag-and-drop flashing** eliminates software dependencies
- **Bootloader integration** ensures reliable updates

## Coming Up Next

In our next post, we'll put all these tools to work as we:

1. **Implement the keyboard matrix scanning** with Embassy async tasks
2. **Set up USB HID communication** for wired operation  
3. **Integrate BLE functionality** for wireless operation
4. **Create a complete key mapping system** with layers and modifiers
5. **Add battery monitoring** and power management features

We'll also explore advanced debugging techniques and performance optimization strategies for wireless keyboards.

## Resources and References

- [cargo-make Documentation](https://github.com/sagiegurari/cargo-make) - Build automation for Rust projects
- [hex-to-uf2 Repository](https://git.sr.ht/~fenris/hex-to-uf2) - UF2 conversion tools
- [probe-rs Documentation](https://probe.rs/docs/tools/debugger/) - Modern embedded debugging
- [VS Code probe-rs Extension](https://github.com/probe-rs/vscode) - Integrated debugging environment  
- [Raspberry Pi Debug Probe](https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html) - Affordable debugging hardware
- [nRFMicro Wiki](https://github.com/joric/nrfmicro/wiki) - Hardware documentation and pinout
- [Adafruit nRF52 Bootloader](https://github.com/adafruit/Adafruit_nRF52_Bootloader) - UF2 bootloader implementation
- [Embassy Framework](https://embassy.dev/book/) - Async embedded development
- [Dactyl-RS Repository](https://github.com/gaarutyunov/dactyl-rs) - Reference implementation

## Conclusion

The modern Rust embedded ecosystem provides professional-grade tools that significantly improve the keyboard firmware development experience. From automated builds with cargo-make to visual debugging with probe-rs and VS Code integration, we now have access to sophisticated development workflows previously available only in expensive commercial toolchains.

The combination of:
- **Powerful hardware** (nRF52840 with wireless capabilities)
- **Modern frameworks** (Embassy for async embedded development) 
- **Professional tools** (probe-rs for debugging, UF2 for deployment)
- **Accessible hardware** (Raspberry Pi Debug Probe, nRFMicro)

Creates an environment where keyboard enthusiasts and professionals alike can build sophisticated, feature-rich firmware without the traditional barriers of embedded development.

The democratization of these tools, combined with the safety and performance of Rust, represents a significant advancement in the mechanical keyboard community's ability to create innovative, wireless keyboards with professional-grade firmware.

---

*This post is part of a series on building mechanical keyboard firmware in Rust. Follow along as we explore the complete journey from setup to advanced features.*