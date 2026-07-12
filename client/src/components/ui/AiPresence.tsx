import { useEffect, useRef } from "react";
import * as THREE from "three";

interface AiPresenceProps {
  state?: "idle" | "thinking" | "streaming" | "listening" | "error";
  size?: number;
}

export default function AiPresence({ state = "idle", size = 48 }: AiPresenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Three.js setups
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);

    // Dynamic light matching day/night
    const isDark = document.documentElement.classList.contains("dark");
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.4 : 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(isDark ? 0x60a5fa : 0x2563eb, 3, 10);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);

    // Build the morphing sphere mesh
    const geometry = new THREE.SphereGeometry(1.4, 32, 32);
    
    // Clone positions to userData as static reference coordinates
    const initialPositions = geometry.attributes.position.clone();
    geometry.userData = { initialPositions };

    // Material with glass reflection features
    const material = new THREE.MeshPhongMaterial({
      color: state === "error" ? 0xef4444 : isDark ? 0x3b82f6 : 0x60a5fa,
      transparent: true,
      opacity: 0.45,
      shininess: 100,
      specular: 0xffffff,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Animation variables
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      const positions = geometry.attributes.position;
      const refPositions = geometry.userData.initialPositions;

      // Morphing configurations based on states
      let freq = 1.8;
      let amp = 0.08;
      let speed = 1.8;

      if (state === "thinking") {
        freq = 3.5;
        amp = 0.18;
        speed = 3.5;
      } else if (state === "listening") {
        freq = 5.0;
        amp = 0.28;
        speed = 5.5;
      } else if (state === "streaming") {
        freq = 2.4;
        amp = 0.14;
        speed = 2.8;
      } else if (state === "error") {
        freq = 3.0;
        amp = 0.25;
        speed = 4.5;
      }

      // Displace vertices along normal direction
      for (let i = 0; i < positions.count; i++) {
        const x = refPositions.getX(i);
        const y = refPositions.getY(i);
        const z = refPositions.getZ(i);

        // Calculate wave height offset
        const offset = Math.sin(x * freq + time * speed) * Math.cos(y * freq + time * speed) * amp;

        // Vector length
        const len = Math.sqrt(x * x + y * y + z * z);
        
        positions.setXYZ(
          i,
          x + (x / len) * offset,
          y + (y / len) * offset,
          z + (z / len) * offset
        );
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();

      // Rotate shape slowly
      mesh.rotation.y = time * 0.15;
      mesh.rotation.x = time * 0.08;

      // Scale breathing
      const scaleVal = 1 + Math.sin(time * 1.5) * 0.04;
      mesh.scale.set(scaleVal, scaleVal, scaleVal);

      // Transition color for errors and states dynamically
      if (state === "error") {
        material.color.setHex(0xef4444);
      } else {
        const currentDark = document.documentElement.classList.contains("dark");
        material.color.setHex(currentDark ? 0x3b82f6 : 0x2563eb);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      renderer.setSize(size, size);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [state, size]);

  return <div ref={containerRef} style={{ width: size, height: size }} className="flex items-center justify-center bg-transparent" />;
}
