import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 2;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
// THREE.ColorManagement.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);
new OrbitControls(camera, renderer.domElement);
const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/8k_earth_daymap.jpg"),
  // specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  // bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  // bumpScale: 0.04,
});
// material.map.colorSpace = THREE.SRGBColorSpace;
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./textures/BlackMarble_2016_3km.jpg"),
  // map: loader.load("./textures/8k_earth_nightmap.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load('./textures/8k_earth_clouds.jpg'),
  alphaTest: 0.3,
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
fresnelMat.uniforms.fresnelBias.value = 0.2; // Example of modifying bias if needed
fresnelMat.transparent = true; // Ensure transparency is enabled
fresnelMat.opacity = 0.5; // Set overall opacity
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const stars = getStarfield({numStars: 1500});
scene.add(stars);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

/////////////

const markerGroup = new THREE.Group(); // Create a group for markers
earthGroup.add(markerGroup); // Add this group to the Earth group

const raycaster = new THREE.Raycaster(); // Initialize raycaster
const mouse = new THREE.Vector2(); // Initialize mouse position
const tooltip = document.getElementById('tooltip'); // Tooltip element

let isHoveringMarker = false;

// Fetch the GeoJSON data and add markers
fetch('./src/heritage_sites.geojson')  // Update the path if needed
  .then(response => response.json())
  .then(data => {
    data.features.forEach(feature => {
      const { coordinates } = feature.geometry; // Coordinates of the heritage site
      const { name, description, year, country, "UNESCO link": unescoLink } = feature.properties; // Site info

      // Convert latitude and longitude to 3D coordinates on the sphere
      const lat = coordinates[1]; // Latitude
      const lon = coordinates[0]; // Longitude
      const radius = 1.01; // Slightly above Earth's surface for visibility
      const pos = convertLatLonToSphereCoords(lat, lon, radius);

      // Create a small sphere as a marker
      const markerGeometry = new THREE.SphereGeometry(0.005, 16, 16);  // Small sphere for marker
      const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red marker
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);

      // Position the marker at the calculated coordinates
      marker.position.set(pos.x, pos.y, pos.z);

      // Store site info for tooltip
      marker.userData = { name, description, year, country, unescoLink, lat, lon };

      // Add the marker to the Earth group
      markerGroup.add(marker);
    });
  })
  .catch(error => console.error("Error fetching GeoJSON data:", error));


// Function to convert latitude and longitude to 3D coordinates on the sphere
function convertLatLonToSphereCoords(lat, lon, radius) {
  const phi = (90 - lat) * Math.PI / 180; // Convert latitude to polar angle
  const theta = (lon) * Math.PI / 180; // Convert longitude to azimuthal angle

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z); // Ensure it returns a THREE.Vector3
}

////////////

// function animate() {
//   requestAnimationFrame(animate);

//   earthGroup.rotation.y += 0.0005; // Rotate the entire Earth group
//   stars.rotation.y -= 0.0001; // Keep the starfield rotation


//   // Apply Earth's rotation to marker positions
//   // No need for manual rotation logic; EarthGroup's rotation is applied directly.
//   markerGroup.children.forEach(marker => {
//     const { lat, lon } = marker.userData;
//     const pos = convertLatLonToSphereCoords(lat, lon, 1.01);
//     marker.position.set(pos.x, pos.y, pos.z); // Position stays correct relative to Earth
//   });

//   renderer.render(scene, camera);
// }

// animate();


// // Tooltip hover logic
// window.addEventListener('mousemove', (event) => {
//   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

//   raycaster.setFromCamera(mouse, camera);
//   const intersects = raycaster.intersectObjects(markerGroup.children);

//   if (intersects.length > 0) {
//     const marker = intersects[0].object;
//     const { name, country } = marker.userData;

//     tooltip.style.display = 'block';
//     tooltip.style.left = `${event.clientX + 10}px`;
//     tooltip.style.top = `${event.clientY + 10}px`;
//     tooltip.innerHTML = `<strong>${name}</strong><br>${country}`;
//   } else {
//     tooltip.style.display = 'none';
//   }
// });

function animate() {
  requestAnimationFrame(animate);

  if (!isHoveringMarker) {
    earthGroup.rotation.y += 0.0001; // Rotate only if not hovering
  }

  stars.rotation.y -= 0.0001;

  renderer.render(scene, camera);
}

animate();

// Tooltip hover logic with rotation stop
window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(markerGroup.children);

  if (intersects.length > 0) {
    const marker = intersects[0].object;
    const { name, description, year, country, unescoLink } = marker.userData;

    tooltip.style.display = 'block';
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
    tooltip.innerHTML = `
      <strong>${name}</strong><br>
      <em>${description}</em><br><br>
      <strong>Year Inscribed:</strong> ${year}<br>
      <strong>Country:</strong> ${country}<br>
      <a href="${unescoLink}" target="_blank">UNESCO Link</a>
    `;

    isHoveringMarker = true; // Stop Earth's rotation
  } else {
    tooltip.style.display = 'none';
    isHoveringMarker = false; // Resume Earth's rotation
  }
});



function handleWindowResize () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);


//danger ahead !!!!!!!!!!!

