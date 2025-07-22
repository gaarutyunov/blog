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

Modern embedded Rust development has evolved significantly, providing us with professional-grade tools that rival traditional embedded development environments. Let's explore each component of our toolchain and understand how they work together with a practical example.

## Practical Example: Blinky LED

Let's examine how all these tools come together in a real keyboard firmware project. The **dactyl-rs** repository demonstrates best practices for wireless keyboard development.

### nRFMicro: Purpose-Built Wireless Controller

The **nRFMicro** represents the evolution of keyboard controllers, combining the nRF52840's powerful capabilities with the familiar Pro Micro form factor. 
In this post we will be using the builtin blue LED pin to check that everything works correctly.

### Understanding the need for UF2 Bootloader

The **Adafruit nRF52 Bootloader** provides the foundation for easy firmware updates. 
It can be used to easily flash the firmware if you don't have the debug probe.

### Project Structure

```
dactyl-rs/
├── Cargo.toml              # Dependencies and project configuration
├── Makefile.toml          # Build automation with cargo-make
├── memory.x               # Memory layout for bootloader compatibility
├── src/
│   └── main.rs           # Main application entry point
├── .cargo/
│   └── config.toml       # Target-specific build configuration
└── .vscode/
    ├── launch.json           # Main application entry point
    └── tasks.json       # Debugging configuration
```

### Memory Layout Configuration

The bootloader requires specific memory layout configuration in your firmware:

```
MEMORY
{
  /* NOTE 1 K = 1 KiB = 1024 bytes */
  /* These values correspond to the nRF52840 WITH Adafruit nRF52 bootloader */
  FLASH : ORIGIN = 0x00001000, LENGTH = 1020K
  RAM : ORIGIN = 0x20000008, LENGTH = 255K

  /* These values correspond to the nRF52840 */
  /* FLASH : ORIGIN = 0x00000000, LENGTH = 1024K */
  /* RAM : ORIGIN = 0x20000000, LENGTH = 256K */
}
```

### Cargo Configuration

```toml
[target.'cfg(all(target_arch = "arm", target_os = "none"))']
runner = "probe-rs run --chip nRF52840_xxAA"
linker = "flip-link"

[build]
target = "thumbv7em-none-eabihf"     # Cortex-M4F and Cortex-M7F (with FPU)

[env]
DEFMT_LOG = "debug"
```

### Build with Cargo-Make

**cargo-make** is a powerful task runner that extends Cargo's capabilities with complex build workflows. For embedded development, where we need to compile, convert formats, and deploy firmware, cargo-make becomes essential.

```toml
# Makefile.toml - Build automation configuration
[config]
default_to_workspace = false

[env]
[tasks.install-llvm-tools]
install_crate = { rustup_component_name = "llvm-tools" }

[tasks.flip-link]
install_crate = { crate_name = "flip-link", binary = "flip-link", test_arg = ["-h"] }

[tasks.objcopy]
install_crate = { crate_name = "cargo-binutils", binary = "cargo", test_arg = [
    "objcopy",
    "--help",
] }
command = "cargo"
args = [
    "objcopy",
    "--release",
    "--bin",
    "dactyl-rs",
    "--",
    "-O",
    "ihex",
    "dactyl-rs.hex",
]
dependencies = ["install-llvm-tools", "flip-link"]

[tasks.uf2]
install_crate = { crate_name = "cargo-hex-to-uf2", binary = "cargo", test_arg = [
    "hex-to-uf2",
    "--help",
] }
command = "cargo"
args = [
    "hex-to-uf2",
    "--input-path",
    "dactyl-rs.hex",
    "--output-path",
    "dactyl-rs.uf2",
    "--family",
    "nrf52840",
]
dependencies = ["objcopy"]
```

This configuration automates our entire build process:
1. **Tool Installation**: Ensures all required tools are available
2. **Compilation**: Builds the firmware for our ARM Cortex-M4 target in HEX format
3. **Format Conversion**: Converts from HEX to UF2 formats

#### From HEX to UF2

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

### Key Dependencies

```toml
[dependencies]
nrf-sdc = { version = "0.1.0", default-features = false, features = [
    "defmt",
    "peripheral",
    "central",
    "nrf52840",
] }
nrf-mpsl = { version = "0.1.0", default-features = false, features = [
    "defmt",
    "critical-section-impl",
    "nrf52840",
] }
bt-hci = { version = "0.3", default-features = false, features = ["defmt"] }

cortex-m = { version = "0.7.7", features = ["critical-section-single-core"] }
cortex-m-rt = "0.7.5"

embassy-futures = { version = "0.1.0" }
embassy-time = { version = "0.4", features = ["tick-hz-32_768", "defmt", "defmt-timestamp-uptime"] }
embassy-nrf = { version = "0.3.1", features = [
    "defmt",
    "nrf52840",
    "time-driver-rtc1",
    "gpiote",
    "unstable-pac",
    "nfc-pins-as-gpio",
    "time",
] }
embassy-executor = { version = "0.7", features = [
    "defmt",
    "arch-cortex-m",
    "executor-thread",
] }
embassy-usb = { version = "0.4", features = ["defmt"] }
embassy-sync = { version = "0.7.0", features = ["defmt"] }

defmt = "1.0"
defmt-rtt = "1.0"
panic-probe = { version = "1.0", features = ["print-defmt"] }
static_cell = "2"

rand = { version = "0.8.4", default-features = false }
rand_core = { version = "0.6" }
rand_chacha = { version = "0.3", default-features = false }
usbd-hid = {version = "0.8.1", default-features = false, features = [
    "defmt",
] }

[patch.crates-io]
embassy-sync = { git = "https://github.com/embassy-rs/embassy.git", rev = "f35aa4005a63e8d478b2b95aaa2bfb316b72dece" }
embassy-futures = { git = "https://github.com/embassy-rs/embassy.git", rev = "f35aa4005a63e8d478b2b95aaa2bfb316b72dece" }
embassy-executor = { git = "https://github.com/embassy-rs/embassy.git", rev = "f35aa4005a63e8d478b2b95aaa2bfb316b72dece" }
embassy-nrf = { git = "https://github.com/embassy-rs/embassy.git", rev = "f35aa4005a63e8d478b2b95aaa2bfb316b72dece" }
embassy-time = { git = "https://github.com/embassy-rs/embassy.git", rev = "f35aa4005a63e8d478b2b95aaa2bfb316b72dece" }
embassy-usb = { git = "https://github.com/embassy-rs/embassy.git", rev = "f35aa4005a63e8d478b2b95aaa2bfb316b72dece" }
embassy-embedded-hal = { git = "https://github.com/embassy-rs/embassy.git", rev = "f35aa4005a63e8d478b2b95aaa2bfb316b72dece" }
nrf-sdc = { git = "https://github.com/alexmoon/nrf-sdc.git", rev = "7be9b853e15ca0404d65c623d1ec5795fd96c204" }
nrf-mpsl = { git = "https://github.com/alexmoon/nrf-sdc.git", rev = "7be9b853e15ca0404d65c623d1ec5795fd96c204" }
bt-hci = { git = "https://github.com/embassy-rs/bt-hci", rev = "50c443e088ab9c405e44a10e98915b445ed7b750" }

[build-dependencies]
xz2 = "0.1.7"
json = "0.12"
const-gen = "1.6"

[profile.dev]
codegen-units = 1      # better optimizations
debug = true
opt-level = 1
overflow-checks = true
lto = false
panic = 'unwind'

[profile.release]
codegen-units = 1       # better optimizations
debug = true            # no overhead for bare-metal
opt-level = "z"         # optimize for binary size
overflow-checks = false
lto = "fat"
```

### Implementation from Embassy examples

To verify that everything works correctly we can just use the basic [example](https://github.com/embassy-rs/embassy/blob/main/examples/nrf52840/src/bin/blinky.rs) from embassy repository that turns the integrated LED on and off. The only difference is the pin number used for the [nRFMicro](https://github.com/joric/nrfmicro/wiki/Pinout) board.

```rust
#![no_std]
#![no_main]

use embassy_executor::Spawner;
use embassy_nrf::gpio::{Level, Output, OutputDrive};
use embassy_time::Timer;
use {defmt_rtt as _, panic_probe as _};

#[embassy_executor::main]
async fn main(_spawner: Spawner) {
    let p = embassy_nrf::init(Default::default());
    // Change the pin number for your board
    let mut led = Output::new(p.P1_10, Level::Low, OutputDrive::Standard);

    loop {
        led.set_high();
        Timer::after_millis(300).await;
        led.set_low();
        Timer::after_millis(300).await;
    }
}
```

### Build and flash

The build is run by the following command which results in a .uf2 file with firmware in the target folder.

```bash
# Using cargo-make for complete build workflow
cargo make uf2             # Convert to UF2 format
```

The resulting UF2 can be directly flashed to the device using the bootloader.

The LED should turn on and off with 300 millliseconds interval. You can change the interval to verify that your code has been flashed correctly.

Don't forget to enter the boot mode to be able to flash the firmware!

## Debugging with Probe-RS

Building and flashing the UF2 may be convenient if you know that the code will work. However, when exploring new technologies it is rarely the case. You may want to debug your code. However, it is not as simple as just launching a debugger inside your favorite IDE. **probe-rs** to the rescue!

**probe-rs** has revolutionized embedded Rust debugging by providing a modern, pure-Rust alternative to proprietary debugging tools. It supports multiple probe types and offers features that rival expensive commercial solutions.

### Key Capabilities

1. **Multi-probe Support**: Works with J-Link, CMSIS-DAP, ST-Link, and other probes
2. **Real-Time Transfer (RTT)**: Printf-style debugging without UART overhead
3. **GDB Integration**: Compatible with existing debugger workflows
4. **Flash Programming**: Built-in flash programming capabilities

### RTT: Game-Changing Debug Output

RTT (Real-Time Transfer) provides bidirectional communication between your firmware and host computer with minimal overhead.

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
probe-rs run --chip nRF52840_xxAA target/thumbv7em-none-eabihf/debug/dactyl-rs
```

## Visual Studio Code Integration

As of time of writing, Jetbrains IDEs [don't have](https://youtrack.jetbrains.com/issue/RUST-12476/Feature-request-add-support-probe-rs-debugging-toolkit) support for DAP protocol. However, the **probe-rs VS Code extension** brings desktop-class debugging to embedded development. This integration provides:

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
            "name": "probe-rs main",
            "cwd": "${workspaceFolder}",
            "connectUnderReset": false,
            "chip": "nRF52840_xxAA",
            "flashingConfig": {
                "flashingEnabled": true,
                "haltAfterReset": true
            },
            "coreConfigs": [
                {
                    "coreIndex": 0,
                    "programBinary": "./target/thumbv7em-none-eabihf/debug/${workspaceFolderBasename}",
                    "rttEnabled": true,
                    "rttChannelFormats": [
                        {
                            "channelNumber": 0,
                            "dataFormat": "Defmt",
                            "showTimestamps": true,
                            "showLocation": true
                        }
                    ]
                }
            ],
            "consoleLogLevel": "Info"
        }
    ]
}
```

This configuration enables:
- **Full debugging support** with breakpoints and stepping
- **RTT integration** with defmt formatting
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
- **Micro-USB**: Host connection with integrated USB hub functionality

### Connection Example

```
Debug Probe      nRFMicro
-----------      --------
    SWD ----------- SWD
    SWC ----------- SWC 
    GND ----------- GND
```

## Coming Up Next

In our next post, we'll put all these tools to work as we:

1. Implement the keyboard matrix scanning
2. Set up USB HID communication for wired operation
3. Add some basic layout

## Resources and References

- [cargo-make Documentation](https://github.com/sagiegurari/cargo-make) - Build automation for Rust projects
- [hex-to-uf2 Repository](https://git.sr.ht/~fenris/hex-to-uf2) - UF2 conversion tools
- [probe-rs Documentation](https://probe.rs/docs/tools/debugger/) - Modern embedded debugging
- [VS Code probe-rs Extension](https://github.com/probe-rs/vscode) - Integrated debugging environment  
- [Raspberry Pi Debug Probe](https://www.raspberrypi.com/documentation/microcontrollers/debug-probe.html) - Affordable debugging hardware
- [nRFMicro Wiki](https://github.com/joric/nrfmicro/wiki) - Hardware documentation and pinout
- [Adafruit nRF52 Bootloader](https://github.com/adafruit/Adafruit_nRF52_Bootloader) - UF2 bootloader implementation
- [Embassy Framework](https://embassy.dev/book/) - Async embedded development
- [Dactyl-RS Repository](https://github.com/gaarutyunov/dactyl-rs/tree/blinky) - Reference implementation

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