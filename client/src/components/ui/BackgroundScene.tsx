import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function BackgroundScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Monitor class list on documentElement for light/dark switches
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // WebGL renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false, // Solid color rendering
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 12);

    // Target configuration values for Day vs Night environments
    const targets = {
      clearColor: new THREE.Color(),
      ambientColor: new THREE.Color(),
      ambientIntensity: 1.0,
      light1Color: new THREE.Color(),
      light1Intensity: 1.0,
      light2Color: new THREE.Color(),
      light2Intensity: 1.0,
      nebulaColor1: new THREE.Color(),
      nebulaColor2: new THREE.Color(),
    };

    const updateTargets = (dark: boolean) => {
      if (dark) {
        // Deep black-blue midnight space environment
        targets.clearColor.setHex(0x02040a);
        targets.ambientColor.setHex(0x0f172a);
        targets.ambientIntensity = 0.5;
        targets.light1Color.setHex(0x3b82f6); // Deep blue cosmic glow
        targets.light1Intensity = 1.8;
        targets.light2Color.setHex(0x6366f1); // Silver indigo glow
        targets.light2Intensity = 1.2;
        targets.nebulaColor1.setHex(0x1e1b4b); // Midnight indigo
        targets.nebulaColor2.setHex(0x312e81); // Violet-blue nebula gas
      } else {
        // Bright cosmic pearl sky environment
        targets.clearColor.setHex(0xdde3ea); // Pale blue-grey space
        targets.ambientColor.setHex(0xa5b4fc); // Soft blue-indigo atmospheric fill
        targets.ambientIntensity = 1.4;
        targets.light1Color.setHex(0xbae6fd); // Bright sky blue light
        targets.light1Intensity = 2.2;
        targets.light2Color.setHex(0xf1f5f9); // Pearl silver light
        targets.light2Intensity = 1.8;
        targets.nebulaColor1.setHex(0xc7d2fe); // Soft lavender haze
        targets.nebulaColor2.setHex(0xbae6fd); // Soft blue haze
      }
    };

    updateTargets(isDarkMode);

    // active transition colors
    const active = {
      clearColor: targets.clearColor.clone(),
      ambientColor: targets.ambientColor.clone(),
      ambientIntensity: targets.ambientIntensity,
      light1Color: targets.light1Color.clone(),
      light1Intensity: targets.light1Intensity,
      light2Color: targets.light2Color.clone(),
      light2Intensity: targets.light2Intensity,
      nebulaColor1: targets.nebulaColor1.clone(),
      nebulaColor2: targets.nebulaColor2.clone(),
    };

    // Lights
    const ambientLight = new THREE.AmbientLight(active.ambientColor, active.ambientIntensity);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(active.light1Color, active.light1Intensity, 60);
    light1.position.set(12, 10, 6);
    scene.add(light1);

    const light2 = new THREE.PointLight(active.light2Color, active.light2Intensity, 60);
    light2.position.set(-12, -10, 6);
    scene.add(light2);

    // --- THREE STAR LAYERS ---
    // 1. Foreground Star Layer (Z = -3 to Z = 4, larger, drifts faster)
    const foreCount = 150;
    const foreGeometry = new THREE.BufferGeometry();
    const forePositions = new Float32Array(foreCount * 3);
    const foreSpeeds = new Float32Array(foreCount);

    for (let i = 0; i < foreCount; i++) {
      forePositions[i * 3] = (Math.random() - 0.5) * 35;
      forePositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      forePositions[i * 3 + 2] = (Math.random() - 0.5) * 7;
      foreSpeeds[i] = 0.015 + Math.random() * 0.015;
    }
    foreGeometry.setAttribute("position", new THREE.BufferAttribute(forePositions, 3));
    const foreMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      transparent: true,
      opacity: 0.85,
    });
    const foreStars = new THREE.Points(foreGeometry, foreMaterial);
    scene.add(foreStars);

    // 2. Middle Star Layer (Z = -15 to Z = -3, medium, drifts at moderate speed)
    const midCount = 800;
    const midGeometry = new THREE.BufferGeometry();
    const midPositions = new Float32Array(midCount * 3);
    const midSpeeds = new Float32Array(midCount);

    for (let i = 0; i < midCount; i++) {
      midPositions[i * 3] = (Math.random() - 0.5) * 45;
      midPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      midPositions[i * 3 + 2] = -Math.random() * 12 - 3;
      midSpeeds[i] = 0.006 + Math.random() * 0.008;
    }
    midGeometry.setAttribute("position", new THREE.BufferAttribute(midPositions, 3));
    const midMaterial = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.08,
      transparent: true,
      opacity: 0.75,
    });
    const midStars = new THREE.Points(midGeometry, midMaterial);
    scene.add(midStars);

    // 3. Distant Galaxy Starfield Layer (Z = -35 to Z = -15, tiny, drifts extremely slowly)
    const distCount = 2500;
    const distGeometry = new THREE.BufferGeometry();
    const distPositions = new Float32Array(distCount * 3);
    const distSpeeds = new Float32Array(distCount);

    for (let i = 0; i < distCount; i++) {
      distPositions[i * 3] = (Math.random() - 0.5) * 60;
      distPositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      distPositions[i * 3 + 2] = -Math.random() * 20 - 15;
      distSpeeds[i] = 0.002 + Math.random() * 0.003;
    }
    distGeometry.setAttribute("position", new THREE.BufferAttribute(distPositions, 3));
    const distMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.65,
    });
    const distStars = new THREE.Points(distGeometry, distMaterial);
    scene.add(distStars);

    // --- COSMIC DUST SYSTEM (Slow-drifting organic space dust) ---
    const dustCount = 200;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSpeeds = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 40;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 25;
      dustPositions[i * 3 + 2] = -Math.random() * 15;
      dustSpeeds[i] = 0.003 + Math.random() * 0.005;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.12,
      transparent: true,
      opacity: 0.45,
    });
    const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustParticles);

    // --- VOLUMETRIC NEBULA CLOUDS (Opaque-less soft spheres far in distance) ---
    const nebulaGroup = new THREE.Group();
    scene.add(nebulaGroup);

    const nebulaCount = 4;
    const nebulae: THREE.Mesh[] = [];
    const nebulaGeom = new THREE.SphereGeometry(6, 16, 16);

    const nebulaMaterials = Array.from({ length: nebulaCount }).map((_, i) => {
      return new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? active.nebulaColor1 : active.nebulaColor2,
        transparent: true,
        opacity: i % 2 === 0 ? 0.08 : 0.05,
        depthWrite: false,
      });
    });

    for (let i = 0; i < nebulaCount; i++) {
      const mesh = new THREE.Mesh(nebulaGeom, nebulaMaterials[i]);
      mesh.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 15,
        -Math.random() * 15 - 15 // Distant Z depth
      );
      mesh.scale.set(
        2.5 + Math.random() * 2.0,
        1.5 + Math.random() * 1.5,
        2.0 + Math.random() * 1.5
      );
      mesh.rotation.z = Math.random() * Math.PI;
      nebulaGroup.add(mesh);
      nebulae.push(mesh);
    }

    // Interactive cursor parallax coordinates
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) - 0.5;
      mouseY = (event.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Resizing
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Watch prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let shouldAnimate = !reducedMotionQuery.matches;

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      shouldAnimate = !e.matches;
    };
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    // Render loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      const time = clock.getElapsedTime();

      // Smoothly update target color setups on light/dark mode states
      updateTargets(document.documentElement.classList.contains("dark"));

      // Smoothly lerp color states towards targets (~1.2s switch transition duration)
      const lerpFactor = 0.05;
      active.clearColor.lerp(targets.clearColor, lerpFactor);
      active.ambientColor.lerp(targets.ambientColor, lerpFactor);
      active.ambientIntensity += (targets.ambientIntensity - active.ambientIntensity) * lerpFactor;
      active.light1Color.lerp(targets.light1Color, lerpFactor);
      active.light1Intensity += (targets.light1Intensity - active.light1Intensity) * lerpFactor;
      active.light2Color.lerp(targets.light2Color, lerpFactor);
      active.light2Intensity += (targets.light2Intensity - active.light2Intensity) * lerpFactor;
      active.nebulaColor1.lerp(targets.nebulaColor1, lerpFactor);
      active.nebulaColor2.lerp(targets.nebulaColor2, lerpFactor);

      // Apply values to scene
      renderer.setClearColor(active.clearColor);
      ambientLight.color.copy(active.ambientColor);
      ambientLight.intensity = active.ambientIntensity;
      light1.color.copy(active.light1Color);
      light1.intensity = active.light1Intensity;
      light2.color.copy(active.light2Color);
      light2.intensity = active.light2Intensity;

      // Animate galaxy elements
      if (shouldAnimate && document.visibilityState === "visible") {
        // 1. Foreground stars drift
        const forePositions = foreGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < foreCount; i++) {
          forePositions[i * 3 + 2] += foreSpeeds[i];
          if (forePositions[i * 3 + 2] > 7) {
            forePositions[i * 3 + 2] = -5;
            forePositions[i * 3] = (Math.random() - 0.5) * 35;
            forePositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
          }
        }
        foreGeometry.attributes.position.needsUpdate = true;

        // 2. Middle stars drift
        const midPositions = midGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < midCount; i++) {
          midPositions[i * 3 + 2] += midSpeeds[i];
          if (midPositions[i * 3 + 2] > -2) {
            midPositions[i * 3 + 2] = -15;
            midPositions[i * 3] = (Math.random() - 0.5) * 45;
            midPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
          }
        }
        midGeometry.attributes.position.needsUpdate = true;

        // 3. Distant stars drift
        const distPositions = distGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < distCount; i++) {
          distPositions[i * 3 + 2] += distSpeeds[i];
          if (distPositions[i * 3 + 2] > -10) {
            distPositions[i * 3 + 2] = -35;
            distPositions[i * 3] = (Math.random() - 0.5) * 60;
            distPositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
          }
        }
        distGeometry.attributes.position.needsUpdate = true;

        // 4. Cosmic dust drift
        const dustPos = dustGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < dustCount; i++) {
          dustPos[i * 3 + 2] += dustSpeeds[i];
          if (dustPos[i * 3 + 2] > 2) {
            dustPos[i * 3 + 2] = -15;
            dustPos[i * 3] = (Math.random() - 0.5) * 40;
            dustPos[i * 3 + 1] = (Math.random() - 0.5) * 25;
          }
        }
        dustGeometry.attributes.position.needsUpdate = true;

        // 5. Nebula rotations and breathing
        nebulae.forEach((neb, index) => {
          neb.rotation.z += 0.0003 * (index + 1);
          const scaleVal = 1 + Math.sin(time * 0.2 + index) * 0.05;
          neb.scale.set(
            (2.5 + index * 0.5) * scaleVal,
            (1.5 + index * 0.3) * scaleVal,
            (2.0 + index * 0.4) * scaleVal
          );

          // Update colors
          const mat = neb.material as THREE.MeshBasicMaterial;
          mat.color.copy(index % 2 === 0 ? active.nebulaColor1 : active.nebulaColor2);
        });

        // Slow camera breathing rotation
        scene.rotation.y = Math.sin(time * 0.08) * 0.02;
        scene.rotation.x = Math.cos(time * 0.05) * 0.015;
      }

      // Smooth camera lerp parallax based on cursor coordinates
      camera.position.x += (mouseX * 2.5 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 2.5 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    render();

    // Visibility handlers to save resources when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        clock.getDelta(); // Reset clock delta
        render();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cancelAnimationFrame(animationFrameId);

      // Dispose Three.js objects
      foreGeometry.dispose();
      foreMaterial.dispose();
      midGeometry.dispose();
      midMaterial.dispose();
      distGeometry.dispose();
      distMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      nebulaGeom.dispose();
      nebulaMaterials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none w-full h-full block bg-transparent"
      style={{ backfaceVisibility: "hidden" }}
    />
  );
}
