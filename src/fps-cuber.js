let camera, scene, renderer, controls, overlay
let moveForward = false
let moveBackward = false
let moveLeft = false
let moveRight = false
let moveUp = true
let velocityY = 0
const gravity = -9.81
const jumpSpeed = 5
const playerSpeed = 4
const worldObjectsSpeed = 2.5
let isMouseDown = false
let lastFireTime = 0
const fireRate = 1000 / 600 * 60

let worldObjects = []
const playerBox = new THREE.Box3()

let world
let playerBody
let bullets = []
let healthDisplay

// collision groups
const playerCollisionGroup = 1
const bulletCollisionGroup = 2
const objectCollisionGroup = 4
const groundCollisionGroup = 8

let shotsFired = 0
let score = 0
let playerHealthPoints = 3
let isDead = false
let neverForget = false

// sounds
const bgMusic = document.getElementById('bg-music')

init()
animate()

function init() {
    initializeScene()
    initializeWorld()
    initializePlayerBody()
    initializeRenderer()
    initializeControls()
    initializeHealthDisplay()
    initializeScoreDisplay()
}

function initializeScene() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    // scene.add(new THREE.GridHelper(100, 100))

    let light = new THREE.PointLight(0xffffff, 1)
    camera.add(light)
    scene.add(camera)
}

function initializeWorld() {
    world = new CANNON.World()
    world.gravity.set(0, gravity, 0)
    world.broadphase = new CANNON.NaiveBroadphase()
    world.solver.iterations = 10

    createGround(20, 1.3)
    createFloor(-8)
    createKillingFloor(-20, -Math.PI / 2)
}

function initializePlayerBody() {
    playerBody = createPlayerBody()
    // bullets never collide with player
    playerBody.collisionFilterGroup = playerCollisionGroup
    playerBody.collisionFilterMask = ~bulletCollisionGroup
    playerBody.addEventListener('collide', (e) => {
        const contact = e.contact
        const cube = worldObjects.find((cubeObj) => cubeObj.body.id === e.body.id)
        if (cube) { // Top or bottom of the cube was hit
            if (contact.ni.y > 0.5 || contact.ni.y < -0.5) {
                playerHealthPoints -= 1
                updateHealthDisplay()
                if (playerHealthPoints <= 0) {
                    gameOver()
                }
                playSound('oof')
                if (playerHealthPoints <= 0) {
                    gameOver()
                }
            } else { }
            if (playerHealthPoints <= 0) {
                gameOver()
            }
        } else { // floor collision
        }
    })
    world.addBody(playerBody)
}

function initializeRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)
}

function initializeControls() {
    controls = new THREE.PointerLockControls(camera, renderer.domElement)
    document.addEventListener('click', () => controls.lock())
    controls.addEventListener('lock', onPointerLockChange)
    controls.addEventListener('unlock', onPointerLockChange)
    controls.getObject().position.set(0, 1.8, 0)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    window.addEventListener('resize', onWindowResize)
}

function initializeHealthDisplay() {
    healthDisplay = document.createElement('div')
    healthDisplay.style.position = 'absolute'
    healthDisplay.style.top = '10px'
    healthDisplay.style.left = '10px'
    healthDisplay.style.color = 'white'
    healthDisplay.style.fontFamily = 'Arial, sans-serif'
    healthDisplay.style.fontSize = '20px'
    healthDisplay.style.zIndex = 100
    document.body.appendChild(healthDisplay)
    updateHealthDisplay()
}

function initializeScoreDisplay() {
    scoreDisplay = document.createElement('div')
    scoreDisplay.style.position = 'absolute'
    scoreDisplay.style.top = '10px'
    scoreDisplay.style.right = '10px'
    scoreDisplay.style.color = 'white'
    scoreDisplay.style.fontFamily = 'Arial, sans-serif'
    scoreDisplay.style.fontSize = '20px'
    scoreDisplay.style.zIndex = 100
    document.body.appendChild(scoreDisplay)
}

function mapIntToHeartString(num) {
    switch (num) {
        case 3:
            return "❤️❤️❤️"
        case 2:
            return "❤️❤️"
        case 1:
            return "❤️"
        case 0:
            return ""
        default:
            return ""
    }
}

function updateHealthDisplay() {
    healthDisplay.innerHTML = mapIntToHeartString(playerHealthPoints)
    updateScreenTint()
}

function updateScoreDisplay() {
    scoreDisplay.innerHTML = `✴️ ${score}`
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = true
            bgMusic.play()
            break
        case 'KeyS':
            moveBackward = true
            break
        case 'KeyA':
            moveLeft = true
            break
        case 'KeyD':
            moveRight = true
            break
        case 'Space':
            if (!moveUp && controls.getObject().position.y <= 1.8) {
                moveUp = true
                playSound('jump')
                playerBody.applyImpulse(new CANNON.Vec3(0, jumpSpeed * playerBody.mass, 0), playerBody.position)
            }
            break
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = false
            break
        case 'KeyS':
            moveBackward = false
            break
        case 'KeyA':
            moveLeft = false
            break
        case 'KeyD':
            moveRight = false
            break
        case 'Space':
            moveUp = false
            break
    }
}

function playSound(type) {
    const sound = document.getElementById(`${type}-sound`)
    const clonedSound = sound.cloneNode(true)
    clonedSound.play()
}

function onPointerLockChange() {
    if (controls.isLocked) {
        controls.enabled = true
        if (playerHealthPoints > 0) {
            bgMusic.play()
        }
    } else {
        controls.enabled = false
        bgMusic.pause()
    }
    moveUp = false
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

function createRandomCube() {
    const size = Math.random() * 2
    const geometry = new THREE.BoxGeometry(size, size, size)
    const color = new THREE.Color(Math.random(), Math.random(), Math.random())
    const material = new THREE.MeshLambertMaterial({ color })
    const cube = new THREE.Mesh(geometry, material)
    cube.position.set(
        (Math.random() - 0.5) * 100,
        size / 2,
        (Math.random() - 0.5) * 100
    )
    const cubeShape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2))
    const cubeBody = new CANNON.Body({
        mass: 0.3,
        shape: cubeShape,
        position: new CANNON.Vec3(cube.position.x, cube.position.y, cube.position.z),
        collisionFilterGroup: objectCollisionGroup,
        collisionFilterMask: ~0 // Collides with everything
    })
    world.addBody(cubeBody)
    worldObjects.push({ mesh: cube, body: cubeBody })
    return cube
}

function randomCubeManagement() {
    if (Math.random() < 0.05) {
        const cube = createRandomCube()
        scene.add(cube)
    }
}

function createPlayerBody() {
    return new CANNON.Body({
        mass: 4,
        position: new CANNON.Vec3(0, 1.8, 0),
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.9, 0.5))
    })
}

function createRandomSphere() {
    const radius = Math.random() * 1
    const geometry = new THREE.SphereGeometry(radius, 32, 32)
    const color = new THREE.Color(Math.random(), Math.random(), Math.random())
    const material = new THREE.MeshLambertMaterial({ color })
    const sphere = new THREE.Mesh(geometry, material)
    sphere.position.set(
        (Math.random() - 0.5) * 100,
        radius,
        (Math.random() - 0.5) * 100
    )
    const sphereShape = new CANNON.Sphere(radius)
    const sphereBody = new CANNON.Body({
        mass: 1,
        shape: sphereShape,
        position: new CANNON.Vec3(sphere.position.x, sphere.position.y, sphere.position.z),
        collisionFilterGroup: objectCollisionGroup,
        collisionFilterMask: ~0 // Collides with everything
    })
    world.addBody(sphereBody)
    worldObjects.push({ mesh: sphere, body: sphereBody })
    return sphere
}

function randomSphereManagement() {
    if (Math.random() < 0.05) {
        const sphere = createRandomSphere()
        scene.add(sphere)
    }
}

function createGround(size, tileSize) {
    const geometry = new THREE.BoxGeometry(tileSize, tileSize, tileSize)
    const material = new THREE.MeshLambertMaterial({ color: 0x888888 })
    function addBox(x, y, z) {
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(x, y, z)
        scene.add(mesh)
        const boxShape = new CANNON.Box(new CANNON.Vec3(tileSize / 2, tileSize / 2, tileSize / 2))
        const boxBody = new CANNON.Body({
            mass: 0,
            shape: boxShape,
            collisionFilterGroup: groundCollisionGroup,
            collisionFilterMask: ~0 // Collides with everything
        })
        boxBody.position.set(x, y, z)
        world.addBody(boxBody)
    }
    for (let x = -size * tileSize / 2; x <= size * tileSize / 2; x += tileSize) {
        for (let z = -size * tileSize / 2; z <= size * tileSize / 2; z += tileSize) {
            const height = tileSize * (Math.floor(Math.random() * 3) - 1)
            if (x === 0 && z === 0) {
                addBox(x, 0, z)
            } else if (Math.random() < 0.94) {
                addBox(x, height, z)
            }
        }
    }
}

function createFloor(height = 0) {
    const geometry = new THREE.BoxGeometry(200, 0.1, 100)
    const material = new THREE.MeshLambertMaterial({ color: 0x000000 })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(0, height, 0)
    scene.add(mesh)
    const boxShape = new CANNON.Box(new CANNON.Vec3(50, 0.05, 50))
    const boxBody = new CANNON.Body({
        mass: 0,
        shape: boxShape,
        collisionFilterGroup: groundCollisionGroup,
        collisionFilterMask: ~0 // Collides with everything
    })
    boxBody.position.set(0, height, 0)
    world.addBody(boxBody)
}

function createKillingFloor(height, rotation) {
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000)
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 })
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial)
    floorMesh.rotation.x = rotation
    floorMesh.position.y = height
    scene.add(floorMesh)
    const floorShape = new CANNON.Plane()
    const floorBody = new CANNON.Body({
        mass: 0,
        shape: floorShape,
        collisionFilterGroup: groundCollisionGroup,
        collisionFilterMask: ~0, // Collides with everything
    })
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), rotation)
    floorBody.position.y = height
    world.addBody(floorBody)
    floorBody.addEventListener('collide', e => {
        if (e.body === playerBody) {
            gameOver()
        }
    })
}

function moveWorldOjectsTowardsPlayer() {
    if (moveUp) return
    if (!neverForget) {
        const shouldMove = Math.random() < (shotsFired / 100)
        if (!shouldMove) return
    }
    const playerPosition = controls.getObject().position.clone()
    worldObjects.forEach(obj => {
        const objPosition = obj.body.position.clone()
        const direction = new THREE.Vector3().subVectors(playerPosition, objPosition).normalize()
        obj.body.applyForce(direction.multiplyScalar(worldObjectsSpeed), objPosition)
    })
}

function fireBullet() {
    const radius = 0.2
    const speed = 111
    const bulletGeometry = new THREE.SphereGeometry(radius)
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial)
    const bulletOffset = new THREE.Vector3(0.1, -0.3, 0)
    let bulletStartPosition = controls.getObject().position.clone().add(bulletOffset)
    bullet.position.copy(bulletStartPosition)
    scene.add(bullet)
    playSound('shoot')
    const bulletShape = new CANNON.Sphere(radius)
    const bulletBody = new CANNON.Body({
        mass: 1,
        shape: bulletShape,
        position: new CANNON.Vec3(bullet.position.x, bullet.position.y, bullet.position.z),
        collisionFilterGroup: bulletCollisionGroup,
        collisionFilterMask: objectCollisionGroup | groundCollisionGroup // Collides with cubes, spheres, and ground
    })
    const direction = controls.getDirection(new THREE.Vector3()).normalize()
    bulletBody.velocity.set(direction.x * speed, direction.y * speed, direction.z * speed)
    world.addBody(bulletBody)
    bullets.push({ mesh: bullet, body: bulletBody })
    bulletBody.addEventListener('collide', (e) => {
        const cube = worldObjects.find((cubeObj) => cubeObj.body.id === e.body.id)
        if (cube) {
            scene.remove(cube.mesh)
            setTimeout(() => {
                world.remove(cube.body)
            }, 0)
            worldObjects = worldObjects.filter((c) => c !== cube)
            cube.mesh.geometry.dispose()
            cube.mesh.material.dispose()
            score += 1
            updateScoreDisplay()
            playSound('hit')
            if (playerHealthPoints < 3) {
                playerHealthPoints += 1
                updateHealthDisplay()
                updateScreenTint()
            }
        }
        shotsFired += 1
        if (shotsFired > 100) {
            neverForget = true
        }
        setTimeout(() => {
            scene.remove(bullet)
            world.remove(bulletBody)
            bullets = bullets.filter((b) => b !== bullet)
            bullet.geometry.dispose()
            bullet.material.dispose()
            shotsFired -= 1
        }, 5000)
    })
}

function fireBulletIfNeeded() {
    const currentTime = performance.now()
    if (isMouseDown && currentTime - lastFireTime >= fireRate) {
        fireBullet()
        lastFireTime = currentTime
    }
}

function updateScreenTint() {
    const tintIntensity = 1 - playerHealthPoints / 3
    const currentTint = new THREE.Color(tintIntensity, 0, 0)
    scene.background.lerp(currentTint, 0.1)
}

function createOverlay() {
    overlay = document.createElement('div')
    overlay.style.position = 'absolute'
    overlay.style.top = 0
    overlay.style.left = 0
    overlay.style.width = '100%'
    overlay.style.height = '100%'
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.75)'
    overlay.style.display = 'flex'
    overlay.style.justifyContent = 'center'
    overlay.style.alignItems = 'center'
    overlay.style.flexDirection = 'column'
    overlay.style.zIndex = 1000
    document.body.appendChild(overlay)
}

function createGameOverText() {
    const gameOverText = document.createElement('h1')
    gameOverText.innerText = 'GAME OVER'
    gameOverText.style.color = 'white'
    gameOverText.style.marginBottom = '1rem'
    overlay.appendChild(gameOverText)
}

function createRestartButton() {
    const restartButton = document.createElement('button')
    restartButton.innerText = 'Restart'
    restartButton.style.padding = '0.5rem 1rem'
    restartButton.style.fontSize = '1.25rem'
    overlay.appendChild(restartButton)
    restartButton.addEventListener('click', () => location.reload())
}

function createGithubStarLink() {
    const githubStarLink = document.createElement('iframe')
    // githubStarLink.src = 'https://ghbtns.com/github-btn.html?user=elhenro&repo=fps-cuber&type=star&count=true'
    githubStarLink.src = 'https://ghbtns.com/github-btn.html?user=elhenro&repo=fps-cuber&type=star'
    githubStarLink.frameBorder = 0
    githubStarLink.scrolling = 0
    githubStarLink.width = 150
    githubStarLink.height = 20
    githubStarLink.title = 'GitHub'
    githubStarLink.style.margin = '10px 10px 10px 92px'
    overlay.appendChild(githubStarLink)
}

function gameOver() {
    playerHealthPoints = 0
    updateHealthDisplay()
    updateScreenTint()
    if (isDead) return
    playSound('oof')

    createOverlay()
    createGameOverText()
    createRestartButton()
    createGithubStarLink()

    isDead = true
    playSound('dead')
    bgMusic.pause()
    controls.unlock()
}

document.addEventListener('mousedown', (event) => { isMouseDown = true })
document.addEventListener('mouseup', (event) => { isMouseDown = false })

function handleMovement() {
    let velocity = new THREE.Vector3()
    let direction = new THREE.Vector3()
    if (moveBackward) velocity.z -= playerSpeed
    if (moveForward) velocity.z += playerSpeed
    if (moveRight) velocity.x -= playerSpeed
    if (moveLeft) velocity.x += playerSpeed
    if (moveUp) {
        velocityY += gravity
    } else if (controls.getObject().position.y > 1.8) {
        velocityY = Math.max(velocityY + gravity, -jumpSpeed)
    } else {
        velocityY = 0
        controls.getObject().position.y = 1.8 // stay above floor
    }
    if (controls.isLocked) {
        const playerDirection = controls.getDirection(direction).normalize()
        const sideDirection = new THREE.Vector3(-playerDirection.z, 0, playerDirection.x).normalize()

        playerBody.velocity.x = 0
        playerBody.velocity.z = 0

        if (moveForward) {
            playerBody.velocity.x += playerDirection.x * playerSpeed
            playerBody.velocity.z += playerDirection.z * playerSpeed
        }
        if (moveBackward) {
            playerBody.velocity.x -= playerDirection.x * playerSpeed
            playerBody.velocity.z -= playerDirection.z * playerSpeed
        }
        if (moveRight) {
            playerBody.velocity.x += sideDirection.x * playerSpeed
            playerBody.velocity.z += sideDirection.z * playerSpeed
        }
        if (moveLeft) {
            playerBody.velocity.x -= sideDirection.x * playerSpeed
            playerBody.velocity.z -= sideDirection.z * playerSpeed
        }
    }
    controls.getObject().position.copy(playerBody.position)
}

function animateWorldObjects() {
    world.step(1 / 60)
    worldObjects.forEach((obj) => {
        obj.mesh.position.copy(obj.body.position)
        obj.mesh.quaternion.copy(obj.body.quaternion)
    })
    bullets.forEach((bulletObj) => {
        bulletObj.mesh.position.copy(bulletObj.body.position)
        bulletObj.mesh.quaternion.copy(bulletObj.body.quaternion)
    })
}

function animate() {
    if (isDead) return
    requestAnimationFrame(animate)
    handleMovement()
    animateWorldObjects()
    randomCubeManagement()
    randomSphereManagement()
    fireBulletIfNeeded()
    moveWorldOjectsTowardsPlayer()
    renderer.render(scene, camera)
}