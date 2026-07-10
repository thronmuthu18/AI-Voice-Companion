import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function BackgroundScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Detect dark mode changes via DOM observer
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

    // Dimensions
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Three.js Setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 10;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.2 : 0.7);
    scene.add(ambientLight);

    // Directional atmospheric lights
    const light1 = new THREE.PointLight(isDarkMode ? 0x4f46e5 : 0xbae6fd, 2, 40); // Indigo or Sky Blue
    light1.position.set(5, 5, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(isDarkMode ? 0x06b6d4 : 0xe0e7ff, 2.5, 40); // Cyan or Soft Indigo
    light2.position.set(-5, -5, 5);
    scene.add(light2);

    // Particle Stars (Tiny stars floating in Z-depth)
    const starCount = 600;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSpeeds = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Spread stars across viewport
      starPositions[i * 3] = (Math.random() - 0.5) * 45; // X
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 45; // Y
      starPositions[i * 3 + 2] = -Math.random() * 30; // Z depth
      starSpeeds[i] = 0.01 + Math.random() * 0.03;
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );

    // Material for tiny stars
    const starMaterial = new THREE.PointsMaterial({
      color: isDarkMode ? 0xffffff : 0x334155,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
    });

    const starParticles = new THREE.Points(starGeometry, starMaterial);
    scene.add(starParticles);

    // Cloud-like floating 3D Volumetric Mesh objects
    const group = new THREE.Group();
    scene.add(group);

    const floatShapes: THREE.Mesh[] = [];
    const shapeCount = 3;

    // Create custom geometries that look like low-poly abstract atmospheric crystals/clouds
    const geometries = [
      new THREE.IcosahedronGeometry(2.5, 1),
      new THREE.IcosahedronGeometry(1.8, 1),
      new THREE.DodecahedronGeometry(1.2, 0),
    ];

    const materials = [
      new THREE.MeshPhongMaterial({
        color: isDarkMode ? 0x312e81 : 0xe0f2fe, // Dark Indigo vs Sky Blue
        transparent: true,
        opacity: isDarkMode ? 0.18 : 0.25,
        flatShading: true,
        shininess: 90,
      }),
      new THREE.MeshPhongMaterial({
        color: isDarkMode ? 0x1e1b4b : 0xf1f5f9, // Darker Slate vs Pearl Gray
        transparent: true,
        opacity: isDarkMode ? 0.15 : 0.22,
        flatShading: true,
        shininess: 70,
      }),
      new THREE.MeshPhongMaterial({
        color: isDarkMode ? 0x0f172a : 0xecfeff, // Deep Dark Blue vs Soft Aqua
        transparent: true,
        opacity: isDarkMode ? 0.2 : 0.28,
        flatShading: true,
        shininess: 100,
      }),
    ];

    for (let i = 0; i < shapeCount; i++) {
      const mesh = new THREE.Mesh(geometries[i], materials[i]);
      // Distribute in space
      mesh.position.set(
        (i - 1) * 6 + (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3,
        -Math.random() * 5
      );
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      group.add(mesh);
      floatShapes.push(mesh);
    }

    // Interactive mouse parallax state
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth) - 0.5;
      mouseY = (event.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Watch resizing
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

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      if (shouldAnimate && document.visibilityState === "visible") {
        // Slow star drift in depth
        const positions = starGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < starCount; i++) {
          positions[i * 3 + 2] += starSpeeds[i]; // Move along Z
          // Recycle stars that move past camera
          if (positions[i * 3 + 2] > 5) {
            positions[i * 3 + 2] = -30;
            positions[i * 3] = (Math.random() - 0.5) * 45;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 45;
          }
        }
        starGeometry.attributes.position.needsUpdate = true;

        // Animate floating mesh geometries
        floatShapes.forEach((mesh, index) => {
          mesh.rotation.x += 0.002 * (index + 1);
          mesh.rotation.y += 0.001 * (index + 2);

          // Breathing scale effect
          const scale = 1 + Math.sin(elapsedTime * 0.5 + index) * 0.08;
          mesh.scale.set(scale, scale, scale);

          // Floating wave offset
          mesh.position.y += Math.sin(elapsedTime * 0.3 + index) * 0.002;
        });

        // Slow breathing rotation on background group
        group.rotation.y = Math.sin(elapsedTime * 0.1) * 0.05;
        group.rotation.x = Math.cos(elapsedTime * 0.08) * 0.03;
      }

      // Smooth camera lerp parallax based on cursor coordinates
      camera.position.x += (mouseX * 3 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 3 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    // Visibility handlers to save resources when tab is unfocused
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        clock.getDelta(); // Reset clock delta
        animate();
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

      // Dispose Three.js objects to avoid memory leaks
      starGeometry.dispose();
      starMaterial.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
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
