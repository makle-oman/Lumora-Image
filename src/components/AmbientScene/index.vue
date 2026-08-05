<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ACESFilmicToneMapping,
  Color,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three'

const canvas = ref<HTMLCanvasElement | null>(null)
let disposeScene: (() => void) | undefined

onMounted(() => {
  const canvasElement = canvas.value
  if (!canvasElement) return

  // High performance WebGL renderer
  const renderer = new WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12

  const scene = new THREE_Scene_Helper()

  // Orthographic camera for ultra-clean 2D alignment (matching rova.chat flat aesthetic)
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new Vector3(0, 0, 0) },
    uResolution: { value: new Vector3(window.innerWidth, window.innerHeight, 1) },
  }

  // Fullscreen 2D plane geometry
  const planeGeo = new PlaneGeometry(2, 2)

  // 2D Flat Rounded Tile Grid & Rich Spectrum Light Shader
  const flatGridMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uMouse;
      uniform vec3 uResolution;
      varying vec2 vUv;

      // Simplex 2D noise for organic liquid light motion
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      // 2D distance to rounded box
      float sdRoundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + vec2(r);
        return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
      }

      void main() {
        float aspect = uResolution.x / uResolution.y;
        vec2 gridDim = vec2(36.0 * (aspect / 1.6), 26.0);
        
        vec2 st = vUv * gridDim;
        vec2 cellId = floor(st);
        vec2 cellUv = fract(st) - vec2(0.5);

        // Mouse interaction distance
        vec2 mouseGrid = (uMouse.xy * 0.5 + vec2(0.5)) * gridDim;
        float mouseDist = length(cellId - mouseGrid);
        float mouseGlow = exp(-mouseDist * 0.26) * uMouse.z;

        // Flat Rounded Tile SDF
        vec2 tileSize = vec2(0.425, 0.425);
        float cornerRadius = 0.09;
        
        float dist = sdRoundedBox(cellUv, tileSize, cornerRadius);

        // Tile mask & soft border ring
        float tileMask = 1.0 - smoothstep(-0.005, 0.008, dist);
        float borderRing = smoothstep(0.015, 0.002, abs(dist + 0.005));

        // Rich, Deep rova.chat Fluid Spectrum Colors
        float t = uTime * 0.60;
        vec2 normCell = cellId / gridDim;

        // Top-center warm sunlight flare
        float sunDist = length(normCell - vec2(0.5, 0.85));
        float topSun = exp(-sunDist * 2.2);
        vec3 colSun = vec3(1.0, 0.78, 0.38); // Balanced Warm Amber Gold

        // Organic flowing color waves
        float wave1 = sin(normCell.x * 6.0 + normCell.y * 5.0 - t * 1.2);
        float wave2 = cos(normCell.x * -5.0 + normCell.y * 6.0 - t * 0.95 + 1.8);
        float wave3 = sin((normCell.x + normCell.y) * 4.5 - t * 0.75 + 3.2);
        float nVal  = snoise(normCell * 3.2 + vec2(t * 0.15));

        // Perfectly balanced vibrant spectrum colors (sweet spot between rich and light)
        vec3 colViolet  = vec3(0.62, 0.40, 0.98); // Balanced Violet #8B5CF6
        vec3 colFuchsia = vec3(0.96, 0.35, 0.65); // Balanced Fuchsia Rose #EC4899
        vec3 colCyan    = vec3(0.22, 0.80, 0.98); // Balanced Cyan Blue #06B6D4
        vec3 colAmber   = vec3(0.98, 0.68, 0.25); // Balanced Warm Amber #F59E0B
        vec3 colTileBase= vec3(0.94, 0.95, 0.98); // Clean frosted tile base

        float w1 = pow(max(0.0, wave1), 1.9);
        float w2 = pow(max(0.0, wave2), 2.0);
        float w3 = pow(max(0.0, wave3), 1.75);
        float w4 = pow(max(0.0, nVal * 0.7 + wave1 * 0.3), 2.2);

        // Combined balanced fluid light field
        vec3 lightField = vec3(0.0);
        lightField += colSun * topSun * 0.60;
        lightField += colViolet * w1 * 0.75;
        lightField += colFuchsia * w2 * 0.70;
        lightField += colCyan * w3 * 0.68;
        lightField += colAmber * w4 * 0.65;
        lightField += vec3(0.50, 0.90, 1.0) * mouseGlow * 1.2;

        float totalLight = clamp(topSun * 0.45 + w1 + w2 + w3 + w4 + mouseGlow * 0.75, 0.0, 1.0);

        // Perfectly balanced frosted tile surface with rich translucency
        vec3 tileColor = mix(colTileBase, lightField + colTileBase * 0.10, totalLight * 0.70);
        tileColor += vec3(1.0) * borderRing * 0.24;

        // Clean subtle grid gap background
        vec3 gapColor = mix(vec3(0.88, 0.90, 0.94), lightField * 0.50 + vec3(0.55), totalLight * 0.55);

        vec3 color = mix(gapColor, tileColor, tileMask);

        // Smooth linear + radial dissolve into white towards bottom
        float bottomFade = smoothstep(0.03, 0.75, vUv.y);
        color = mix(vec3(1.0), color, bottomFade);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })

  const gridMesh = new THREE_Mesh_Helper(planeGeo, flatGridMaterial)
  scene.add(gridMesh)

  // Pointer Events
  const pointer = { x: 0, y: 0, active: 0 }
  const easedPointer = { x: 0, y: 0, active: 0 }

  const handlePointerMove = (event: PointerEvent): void => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1
    pointer.active = 1.0
  }

  const handlePointerLeave = (): void => {
    pointer.active = 0.0
  }

  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerleave', handlePointerLeave, { passive: true })

  // Handle Window Resize
  const resize = (): void => {
    const width = window.innerWidth
    const height = window.innerHeight
    renderer.setSize(width, height, false)
    uniforms.uResolution.value.set(width, height, 1)
  }

  window.addEventListener('resize', resize)
  resize()

  // Render Loop
  const timer = new Timer()
  timer.connect(document)
  let animationFrame = 0

  const render = (timestamp?: number): void => {
    timer.update(timestamp)
    const time = timer.getElapsed()

    easedPointer.x += (pointer.x - easedPointer.x) * 0.06
    easedPointer.y += (pointer.y - easedPointer.y) * 0.06
    easedPointer.active += (pointer.active - easedPointer.active) * 0.05

    uniforms.uTime.value = time
    uniforms.uMouse.value.set(easedPointer.x, easedPointer.y, easedPointer.active)

    renderer.render(scene.getScene(), camera)
    animationFrame = window.requestAnimationFrame(render)
  }

  render()

  disposeScene = () => {
    window.cancelAnimationFrame(animationFrame)
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerleave', handlePointerLeave)

    planeGeo.dispose()
    flatGridMaterial.dispose()
    timer.dispose()
    renderer.dispose()
  }
})

// Helper Class
import { Object3D, Scene as ThreeScene } from 'three'
class THREE_Scene_Helper {
  private scene: ThreeScene
  constructor() {
    this.scene = new ThreeScene()
    this.scene.background = new Color(0xffffff)
  }
  add(object: Object3D) {
    this.scene.add(object)
  }
  getScene() {
    return this.scene
  }
}
import { Mesh as THREE_Mesh_Helper } from 'three'

onBeforeUnmount(() => disposeScene?.())
</script>

<template>
  <canvas ref="canvas" class="ambient-scene" aria-hidden="true" />
</template>

<style scoped>
.ambient-scene {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
