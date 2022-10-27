import * as THREE from "three";

import WebGL from "three/examples/jsm/capabilities/WebGL";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";

let camera, scene, renderer, controls;
let renderTarget;
let postScene, postCamera;

// const parameters = {
//   samples: 4,
//   wireframe: false
// };

// const gui = new GUI();
// gui.add(parameters, "samples", 0, 4).step(1);
// gui.add(parameters, "wireframe");
// gui.onChange(render);

init();

function init() {
  if (WebGL.isWebGL2Available() === false) {
    document.body.appendChild(WebGL.getWebGL2ErrorMessage());
    return;
  }

  const canvas = document.querySelector("canvas");
  const gl = canvas.getContext("webgl2", {
    powerPreference: "high-performance",
  });

  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("canvas"),
    context: gl,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // document.body.appendChild(renderer.domElement);

  // Create a multi render target with Float buffers

  renderTarget = new THREE.WebGLMultipleRenderTargets(
    window.innerWidth * window.devicePixelRatio,
    window.innerHeight * window.devicePixelRatio,
    2
  );

  for (let i = 0, il = renderTarget.texture.length; i < il; i++) {
    renderTarget.texture[i].minFilter = THREE.NearestFilter;
    renderTarget.texture[i].magFilter = THREE.NearestFilter;
  }

  // Name our G-Buffer attachments for debugging

  renderTarget.texture[0].name = "diffuse";
  renderTarget.texture[1].name = "normal";

  // Scene setup

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    50
  );
  camera.position.z = 4;

  const loader = new THREE.TextureLoader();

  const textureUrl = require("./assets/hardwood2_diffuse.jpeg");
  const diffuse = loader.load(textureUrl, render);

  // https://threejs.org/examples/textures/hardwood2_diffuse.jpg

  // const diffuse = loader.load(
  //   "https://threejs.org/examples/textures/hardwood2_diffuse.jpg",
  //   () => {
  //     render();
  //   }
  // );

  const hardWoodMaterial = new THREE.MeshBasicMaterial({
    // color: 0xffffff,
    map: diffuse,
  });

  console.log("diffuse", diffuse);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.RepeatWrapping;

  scene.add(
    new THREE.Mesh(
      new THREE.TorusKnotGeometry(1, 0.3, 128, 32),
      // hardWoodMaterial
      new THREE.RawShaderMaterial({
        vertexShader: document
          .querySelector("#gbuffer-vert")
          .textContent.trim(),
        fragmentShader: document
          .querySelector("#gbuffer-frag")
          .textContent.trim(),
        uniforms: {
          tDiffuse: { value: diffuse },
          repeat: { value: new THREE.Vector2(5, 0.5) },
        },
        glslVersion: THREE.GLSL3,
      })
    )
  );

  // PostProcessing setup

  postScene = new THREE.Scene();
  postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  postScene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.RawShaderMaterial({
        vertexShader: document.querySelector("#render-vert").textContent.trim(),
        fragmentShader: document
          .querySelector("#render-frag")
          .textContent.trim(),
        uniforms: {
          tDiffuse: { value: renderTarget.texture[0] },
          tNormal: { value: renderTarget.texture[1] },
        },
        glslVersion: THREE.GLSL3,
      })
    )
  );

  // Controls
  // console.log("domElement", renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.update();
  controls.addEventListener("change", render);
  controls.enableZoom = false;

  window.addEventListener("resize", onWindowResize);

  render();
}

function onWindowResize() {
  // console.log("onWindowResize", window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  const dpr = renderer.getPixelRatio();
  renderTarget.setSize(window.innerWidth * dpr, window.innerHeight * dpr);

  render();
}

function render() {
  // MRT off
  // renderer.render(scene, camera);
  // renderer.setRenderTarget(null);

  // MRT on
  // renderTarget.samples = parameters.samples;

  // scene.traverse(function (child) {
  //   if (child.material !== undefined) {
  //     child.material.wireframe = parameters.wireframe;
  //   }
  // });

  // render scene into target
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);

  // render post FX
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);

  // requestAnimationFrame(render);
}
