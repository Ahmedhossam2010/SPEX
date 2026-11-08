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
      return this.createFallbackDataTexture(12, 16, 29);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.createFallbackDataTexture(12, 16, 29);

    // Base dark graphite floor
    ctx.fillStyle = '#0c101d';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle plate grid panels
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
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

    // Corner rivets and sci-fi accent lines
    ctx.fillStyle = '#334155';
    for (let x = 64; x < 512; x += 128) {
      for (let y = 64; y < 512; y += 128) {
        ctx.beginPath();
        ctx.arc(x - 50, y - 50, 2, 0, Math.PI * 2);
        ctx.arc(x + 50, y - 50, 2, 0, Math.PI * 2);
        ctx.arc(x - 50, y + 50, 2, 0, Math.PI * 2);
        ctx.arc(x + 50, y + 50, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Subtle cyan pathway guide line
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // Station wall panel texture with high-tech carbon framing
  public static createWallTexture(): THREE.Texture {
    if (typeof document === 'undefined') {
      return this.createFallbackDataTexture(9, 13, 22);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return this.createFallbackDataTexture(9, 13, 22);

    // Dark slate background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 512);

    // Panel borders
    ctx.strokeStyle = '#1e2638';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 496);

    // Inner bevel
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, 464, 464);

    // Diagonal hazard warning stripes at bottom
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 490);
      ctx.lineTo(i + 16, 490);
      ctx.lineTo(i + 32, 512);
      ctx.lineTo(i + 16, 512);
      ctx.closePath();
      ctx.fill();
    }

    // Technical nomenclature text
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('SPHEREx ORBITAL LAB // SECTOR-7B', 36, 48);

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
