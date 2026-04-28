import Cocoa
import QuartzCore

// Create NSApplication
let app = NSApplication.shared
app.setActivationPolicy(.accessory) // No dock icon

// Get main screen size
guard let screen = NSScreen.main else { exit(0) }
let frame = screen.frame

// Create transparent window
let window = NSWindow(
    contentRect: frame,
    styleMask: .borderless,
    backing: .buffered,
    defer: false
)
window.level = .floating
window.backgroundColor = .clear
window.isOpaque = false
window.hasShadow = false
window.ignoresMouseEvents = true
window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

// Create the content view
let contentView = NSView(frame: frame)
contentView.wantsLayer = true
contentView.layer?.backgroundColor = NSColor.clear.cgColor
window.contentView = contentView

// Create a small rectangle image for confetti pieces
func createConfettiImage() -> CGImage? {
    let size = CGSize(width: 20, height: 12)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: Int(size.width),
        height: Int(size.height),
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }

    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(origin: .zero, size: size))
    return context.makeImage()
}

// Function to create emitter at position
func createEmitter(at position: CGPoint) -> CAEmitterLayer {
    let emitter = CAEmitterLayer()
    emitter.emitterPosition = position
    emitter.emitterSize = CGSize(width: 10, height: 10)
    emitter.emitterShape = .point
    emitter.renderMode = .additive

    // Create multiple colored confetti cells
    let colors: [NSColor] = [
        .systemRed, .systemBlue, .systemGreen,
        .systemYellow, .systemOrange, .systemPink, .systemPurple
    ]

    var cells: [CAEmitterCell] = []
    for color in colors {
        let cell = CAEmitterCell()
        cell.birthRate = 30
        cell.lifetime = 3.0
        cell.velocity = 400
        cell.velocityRange = 100
        cell.emissionLongitude = .pi / 2 // Downward
        cell.emissionRange = .pi / 4
        cell.spin = 4.0
        cell.spinRange = 8.0
        cell.scale = 0.04
        cell.scaleRange = 0.02
        cell.color = color.cgColor
        cell.contents = createConfettiImage()
        cell.yAcceleration = 200 // gravity
        cells.append(cell)
    }

    emitter.emitterCells = cells
    return emitter
}

// Add emitters from top corners
let leftEmitter = createEmitter(at: CGPoint(x: 0, y: frame.height))
let rightEmitter = createEmitter(at: CGPoint(x: frame.width, y: frame.height))

contentView.layer?.addSublayer(leftEmitter)
contentView.layer?.addSublayer(rightEmitter)

window.makeKeyAndOrderFront(nil)

// Stop emitting after 1 second, close after 2.5 seconds total
DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
    leftEmitter.birthRate = 0
    rightEmitter.birthRate = 0
}

DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
    app.terminate(nil)
}

app.run()
