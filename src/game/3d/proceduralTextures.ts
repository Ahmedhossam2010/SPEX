import * as THREE from 'three';

// Generates procedural canvas textures for station architecture with zero external 404 dependencies
export class ProceduralTextures {
  private static createFallbackDataTexture(r = 12, g = 16, b = 29): THREE.Texture {
    const data = new Uint8Array([r, g, b, 255]);
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Sci-fi station floor metal plating with subtle grid grooves
  public static createFloorTexture(): THREE.Texture {
    if (typeof document === 'undefined') {
      return this.createFallbackDataTexture(32, 42, 60);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.createFallbackDataTexture(32, 42, 60);

    // Visible, brushed research station metal floor plating
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle brushed metal noise/texture
    ctx.fillStyle = '#263449';
    for (let x = 0; x < 512; x += 128) {
      for (let y = 0; y < 512; y += 128) {
        ctx.fillRect(x + 4, y + 4, 120, 120);
      }
    }

    // Plate grid seams with metallic bevel
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // High-contrast corner rivets
    ctx.fillStyle = '#94a3b8';
    for (let x = 64; x < 512; x += 128) {
      for (let y = 64; y < 512; y += 128) {
        ctx.beginPath();
        ctx.arc(x - 52, y - 52, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 52, y - 52, 2.5, 0, Math.PI * 2);
        ctx.arc(x - 52, y + 52, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 52, y + 52, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bright illuminated walking guide pathway (Center Neon Strip)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    // Directional chevron markings on guide path
    ctx.fillStyle = '#38bdf8';
    for (let y = 32; y < 512; y += 96) {
      ctx.beginPath();
      ctx.moveTo(256, y - 12);
      ctx.lineTo(268, y);
      ctx.lineTo(262, y);
      ctx.lineTo(256, y - 6);
      ctx.lineTo(250, y);
      ctx.lineTo(244, y);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Station wall panel texture with high-tech carbon framing & illuminated light strips
  public static createWallTexture(): THREE.Texture {
    if (typeof document === 'undefined') {
      return this.createFallbackDataTexture(30, 41, 59);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.createFallbackDataTexture(30, 41, 59);

    // Visible architectural slate base
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    // Inner panel plate with lighter contrast
    ctx.fillStyle = '#293548';
    ctx.fillRect(16, 16, 480, 480);

    // Panel outer borders with metallic bevel
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 492, 492);

    // Inner architectural recessed border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, 456, 456);

    // Eye-level neon accent light strip (Cyan & Gold)
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(28, 240, 456, 8);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(28, 252, 456, 4);

    // Diagonal hazard warning stripes at bottom
    ctx.fillStyle = '#f59e0b';
    for (let i = 28; i < 484; i += 28) {
      ctx.beginPath();
      ctx.moveTo(i, 460);
      ctx.lineTo(i + 14, 460);
      ctx.lineTo(i + 28, 484);
      ctx.lineTo(i + 14, 484);
      ctx.closePath();
      ctx.fill();
    }

    // Technical nomenclature text
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SPHEREx ORBITAL PLATFORM // SECTOR-01 MAIN CONTROL', 36, 52);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText('NASA IPAC INFRARED MISSION RESEARCH STATION', 36, 72);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Glowing console terminal display screen
  public static createTerminalScreenTexture(title: string, subtitle: string, color: string = '#06b6d4'): THREE.Texture {
    if (typeof document === 'undefined') {
      return this.createFallbackDataTexture(6, 182, 212);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.createFallbackDataTexture(6, 182, 212);

    // Dark screen
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, 512, 256);

    // Glowing border
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 244);

    // Grid background
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Title & Status
    ctx.fillStyle = color;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`[ ${title.toUpperCase()} ]`, 24, 44);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '14px monospace';
    ctx.fillText(subtitle, 24, 80);

    // Simulated telemetry wave graph
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 160);
    for (let x = 24; x < 488; x += 10) {
      const y = 160 + Math.sin(x * 0.05) * 20 + Math.cos(x * 0.12) * 10;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Prompt bar at bottom
    ctx.fillStyle = color;
    ctx.fillRect(24, 210, 464, 28);
    ctx.fillStyle = '#030712';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('PRESS [E] OR TAP TO ACCESS CONSOLE INTERFACE', 36, 229);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Deep cosmic space nebula texture for sky dome
  public static createSpaceSkyTexture(): THREE.Texture {
    if (typeof document === 'undefined') {
      return this.createFallbackDataTexture(2, 4, 10);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.createFallbackDataTexture(2, 4, 10);

    // Deep space black to dark navy gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#02040a');
    grad.addColorStop(0.5, '#060a17');
    grad.addColorStop(1, '#02040a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Cyan / Purple infrared nebula clouds
    const neb1 = ctx.createRadialGradient(320, 220, 20, 320, 220, 280);
    neb1.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
    neb1.addColorStop(0.5, 'rgba(99, 102, 241, 0.12)');
    neb1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb1;
    ctx.fillRect(0, 0, 1024, 512);

    const neb2 = ctx.createRadialGradient(780, 280, 30, 780, 280, 240);
    neb2.addColorStop(0, 'rgba(236, 72, 153, 0.18)');
    neb2.addColorStop(0.6, 'rgba(168, 85, 247, 0.08)');
    neb2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, 1024, 512);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const r = Math.random() * 1.5;
      const alpha = 0.3 + Math.random() * 0.7;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
