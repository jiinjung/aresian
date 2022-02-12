import './style.css'
import * as dat from 'lil-gui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { lonlat2cart } from './Utils/lonlat2cart.js'
import { fl } from './Utils/featureLocations.js'

import { gsap } from 'gsap'
import { PolyhedronGeometry, Raycaster } from 'three'
import overlayVertexShader from './shaders/overlay/vertex.glsl'
import overlayFragementShader from './shaders/overlay/fragment.glsl'

/**
 * Base
 */
// Debug
//const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Entry title
const title = document.querySelector('div.entrytitle');
window.setTimeout(() => {title.remove();},4000);

/**
 * Overlay
 */
const overlayGeometry = new THREE.PlaneBufferGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms:
    {
        uAlpha: { value: 1 }
    },
    vertexShader: overlayVertexShader,
    fragmentShader: overlayFragementShader
})
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)

/**
 * Loaders
 */
let sceneReady = false
const loadingManager = new THREE.LoadingManager(
    () =>
    {
        window.setTimeout(()=>
        {
            gsap.to(overlayMaterial.uniforms.uAlpha, {duration: 2, value: 0 })
            document.body.classList.add('grabbable');
        }, 1000)
        window.setTimeout(()=>
        {
            sceneReady = true;
        }, 1500)
        
    }
)

// Texture loader
const textureLoader = new THREE.TextureLoader(loadingManager)

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader(loadingManager)
gltfLoader.setDRACOLoader(dracoLoader)

/** 
 * Textures
 */
const bakedTexture = textureLoader.load('/models/5672_mars_4k_color.jpg')
bakedTexture.flipY = false
bakedTexture.encoding = THREE.sRGBEncoding

/**
 * Materials
 */
// Baked material
// const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedTexture })

// gltfLoader.load(
//     '/models/moonrender.glb',
//     (gltf) =>
//     {
//         gltf.scene.traverse((child)=>
//         {
//             child.material = bakedMaterial
//         })
//         scene.add(gltf.scene)
//     }
// )

const moon = new THREE.Mesh( 
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshStandardMaterial({ 
        map: bakedTexture,
    })
)

scene.add(moon)


/**
 * Points of Interests
 */
const Radius = 1.01

const pointContainer = document.createElement("div");
pointContainer.className="pointContainer";

// return onclick function to make navbar visible
function navOnOff(){
    const nav = document.querySelector('.navbar');
    nav.classList.toggle('visible');
    document.body.classList.toggle('grabbable');
}
window.navOnOff=navOnOff;

const points = fl.map((d,i)=>{

    // Create point
    const pointDiv = document.createElement("div");
    pointDiv.className = `point point-${i}`;
    pointDiv.onclick = navOnOff;

    // Create circled number
    const labelDiv = document.createElement("div");
    labelDiv.className = "label"
    labelDiv.textContent = String(i + 1);
    pointDiv.appendChild(labelDiv);

    // Create text description
    const textDiv = document.createElement("div");
    textDiv.className = "text"
    textDiv.innerHTML = `<div>${d.name}</div>`;
    pointDiv.appendChild(textDiv);

    pointContainer.appendChild(pointDiv);
    
    return {  
        //lonlat2cart(radius, latitude (N=+, S=-) , longitude (E=+, W=-))
        position: lonlat2cart(Radius, d.lat, d.lon),
        element: pointDiv,
    };

});

document.body.appendChild(pointContainer);

const raycaster = new Raycaster()


/**
 * Lights
 */
//const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
const ambientLight = new THREE.AmbientLight(0xffffff, 1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.1)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.position.set(1, 1, 1)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
console.log(sizes)

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camdist=( sizes.width>sizes.height ? 2.5 : 2.5 * sizes.height/sizes.width);
    camera.position.set(camdist, 0, 0);
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    
    // Update controls
    controls.maxDistance = 1.1 * camdist;
    controls.minDistance = Math.max(2, 0.5 * camdist);
    
    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
let camdist=( sizes.width>sizes.height ? 2.5 : 2.5 * sizes.height/sizes.width);
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 10)
camera.position.set(camdist, 0, 0)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0, 0)
controls.enableDamping = true
controls.enablePan = false;
controls.maxDistance = 1.1 * camdist;
controls.minDistance = Math.max(2, 0.5 * camdist);
controls.maxPolarAngle = Math.PI * 3/4;
controls.minPolarAngle = Math.PI /4;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime


    if(sceneReady)
    {
        
        // Go through each point
        for(const point of points)
        {
            const screenPosition = point.position.clone()
            screenPosition.project(camera)

            raycaster.setFromCamera(screenPosition, camera)
            const intersects = raycaster.intersectObjects(scene.children, true)

            if(intersects.length === 0)
            {
                point.element.classList.add('visible')
            }
            else{

                const intersectionDistance = intersects[0].distance
                const pointDistance = point.position.distanceTo(camera.position)

                if(intersectionDistance < pointDistance)
                {
                    point.element.classList.remove('visible')
                }
                else
                { 
                    point.element.classList.add('visible')
                }
            
            }

            const translateX = screenPosition.x * sizes.width * 0.5
            const translateY = - screenPosition.y * sizes.height * 0.5
            point.element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`
        }
    }
    

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()



/**
 * Keyboard Controls
 */

// escape key to navbar not visible
document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape') {
        const nav = document.querySelector('.navbar');
        nav.classList.remove('visible');
        document.body.classList.toggle('grabbable');
    }
});

// function enter(){
//     window.location.href = 'login.html';
// };

// document.querySelector('.login').onclick = 

// function enter(event) {
//     if(event.key === 'Enter') {
//         const nav = document.querySelector('.navbar');
//         nav.classList.add('visible');
//         document.body.classList.toggle('grabbable');
//     }
// }
