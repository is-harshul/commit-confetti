import Cocoa
import QuartzCore

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let previousApp = NSWorkspace.shared.frontmostApplication

guard let screen = NSScreen.main else { exit(0) }
let frame = screen.frame

let window = NSPanel(
    contentRect: frame,
    styleMask: [.borderless, .nonactivatingPanel],
    backing: .buffered,
    defer: false
)
window.level = .init(Int(CGWindowLevelForKey(.maximumWindow)))
window.hidesOnDeactivate = false
window.backgroundColor = .clear
window.isOpaque = false
window.hasShadow = false
window.ignoresMouseEvents = true
window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]

let contentView = NSView(frame: frame)
contentView.wantsLayer = true
contentView.layer?.backgroundColor = NSColor.clear.cgColor
window.contentView = contentView

func createConfettiImage() -> CGImage? {
    let size = CGSize(width: 20, height: 12)
    guard let context = CGContext(
        data: nil,
        width: Int(size.width),
        height: Int(size.height),
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }
    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(origin: .zero, size: size))
    return context.makeImage()
}

func createEmitter(at position: CGPoint, angle: CGFloat) -> CAEmitterLayer {
    let emitter = CAEmitterLayer()
    emitter.emitterPosition = position
    emitter.emitterSize = CGSize(width: 1, height: 1)
    emitter.emitterShape = .point
    emitter.renderMode = .oldestLast

    let colors: [NSColor] = [
        .systemRed, .systemBlue, .systemGreen,
        .systemYellow, .systemOrange, .systemPink, .systemPurple
    ]

    let confettiImage = createConfettiImage()
    var cells: [CAEmitterCell] = []

    for color in colors {
        let cell = CAEmitterCell()
        cell.birthRate = 40
        cell.lifetime = 1.5
        cell.velocity = 800
        cell.velocityRange = 900
        cell.emissionLongitude = angle
        cell.emissionRange = CGFloat.pi / 3
        cell.spin = 4.0
        cell.spinRange = 8.0
        cell.scale = 0.45
        cell.scaleRange = 0.20
        cell.color = color.cgColor
        cell.contents = confettiImage
        cell.yAcceleration = -600
        cells.append(cell)
    }

    emitter.emitterCells = cells
    return emitter
}

let leftEmitter = createEmitter(at: CGPoint(x: 0, y: 0), angle: CGFloat.pi / 4)
let rightEmitter = createEmitter(at: CGPoint(x: frame.width, y: 0), angle: 3 * CGFloat.pi / 4)

contentView.layer?.addSublayer(leftEmitter)
contentView.layer?.addSublayer(rightEmitter)

window.orderFrontRegardless()

if let prev = previousApp {
    prev.activate(options: [])
}
DispatchQueue.main.async {
    if let prev = previousApp, !prev.isActive {
        prev.activate(options: [])
    }
}

DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
    leftEmitter.birthRate = 0
    rightEmitter.birthRate = 0
}

DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
    app.terminate(nil)
}

app.run()
