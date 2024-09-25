const form = document.getElementById('chat-form')
const formLogin = document.getElementById('login-form')
const input = document.getElementById('message-input')
const inputLogin = document.getElementById('login-input')
const messages = document.getElementById('messages')
const audioPlayback = document.getElementById('audio-playback')
const filesButton = document.getElementById('btn-files')
let shouldOut = true

const trigger = document.querySelector('#emoji-button')
let mediaRecorder
const audioChuncks = []
trigger?.addEventListener('mousedown', () => {
	navigator.mediaDevices
		.getUserMedia({
			audio: true,
		})
		.then((stream) => {
			mediaRecorder = new MediaRecorder(stream)
			mediaRecorder.start()
		})
})

const socket = io()

let userLogin

form.addEventListener('submit', function (e) {
	e.preventDefault()
	sendMessage()
	form.reset()
})

formLogin.addEventListener('submit', async function (e) {
	e.preventDefault()
	try {
		const response = await fetch('/user', {
			method: 'POST',
			body: JSON.stringify({ password: inputLogin.value }),
			headers: {
				'Content-Type': 'application/json',
			},
		})

		userLogin = await response.json()
		if (userLogin) {
			formLogin.parentElement.style.display = 'none'

			/*for (const msg of msgs) {
				createBallon(msg)
			}*/
			registerServiceWork()
			socket.emit('id', userLogin.id)
			fetch('/hidden', {
				method: 'POST',
				body: JSON.stringify({ hidden: false, userID: userLogin.id }),
				headers: {
					'Content-Type': 'application/json',
				},
			})
		} else {
			location.href = 'https://www.youtube.com/'
		}
	} catch (error) {
		location.href = 'https://www.youtube.com/'
	}
	formLogin.reset()
})

socket.on('chat message', function ({ msg }) {
	if (msg.fromID !== userLogin.id && msg.toID !== userLogin.id) return
	createBallon(msg)
	if (msg.toID === userLogin.id && !msg.received) {
		socket.emit('received-message', msg.id)
	}
})

socket.on('chat messages', function (messages) {
	messages.innerHTML = ''
	for (const { msg } of messages) {
		createBallon(msg)
		if (msg.toID === userLogin.id) {
			socket.emit('received-message', msg.id)
		}
	}
})

socket.on('lastRefresh', (date) => {
	const span = document.createElement('span')
	span.textContent = date
	//document.querySelector('body').appendChild(span)
})

socket.on('status', (users) => {
	users.forEach((user) => {
		if (user.id !== userLogin.id) {
			document.querySelector('#status').textContent = user.status
			if (user.status === 'Online') {
				socket.emit('id', userLogin.id)
			}
		}
	})
})

/*socket.on('file upload', ({ msg }) => {
	const item = document.createElement('div')
	item.className = 'item'

	item.style.justifyContent = msg.toID === userLogin.id ? 'left' : 'right'

	const fileBlob = new Blob([buffer], { type: msg.type })
	const fileUrl = URL.createObjectURL(fileBlob)
	const el = msg.type.includes('image') ? 'img' : msg.type.includes('video/png') ? 'video' : 'a'

	const fileElement = document.createElement(el)
	fileElement.controls = true
	fileElement.src = fileUrl
	item.appendChild(fileElement)
	messages.appendChild(item)
	messages.scrollTop = messages.scrollHeight
})*/

socket.on('image message', ({ imgBuffer, toID }) => {
	const imgBlob = new Blob([imgBuffer], { type: 'image/bmp' })
	const imgUrl = URL.createObjectURL(imgBlob)
	const imgElement = document.createElement('img')
	imgElement.src = imgUrl
	audioElement.style.float = toID === userLogin.id ? 'right' : 'left'
	messages.appendChild(imgUrl)
	messages.scrollTop = messages.scrollHeight
})

const createBallon = (msg) => {
	const timeDate = new Date(msg.time)
	const item = document.createElement('div')
	if (msg.blob?.type) {
		debugger
	}
	const el = msg.blob?.type?.includes('image')
		? 'img'
		: msg.blob?.type?.includes('video/png')
		? 'video'
		: msg.blob?.type?.includes('audio/webm')
		? 'audio'
		: msg.text
		? 'div'
		: 'a'
	const ballon = document.createElement(el)
	ballon.controls = true
	const time = document.createElement('span')
	item.className = 'item'
	ballon.className = el === 'audio' ? '' : 'ballon'
	ballon.textContent = msg.text || msg.blob.name
	if (msg.text === 'Essa mensagem foi apagada') {
		ballon.style.fontStyle = 'italic'
		ballon.style.color = 'gray'
	}
	time.textContent = `${timeDate.getDate()}/${(timeDate.getMonth() + 1)
		.toString()
		.padStart(2, '0')}/${timeDate.getFullYear()} ${timeDate.getHours()}:${timeDate.getMinutes().toString().padStart(2, '0')}`
	ballon.addEventListener('contextmenu', (event) => {
		event.preventDefault()
	})
	time.style.setProperty('--clr', msg.toID === userLogin.id ? 'transparent' : msg.received ? '#48baf9' : 'gray')
	ballon.appendChild(time)
	item.appendChild(ballon)
	item.style.justifyContent = msg.fromID !== userLogin.id ? 'left' : 'right'
	ballon.classList.add(msg.fromID !== userLogin.id ? 'no-me' : 'me')
	ballon.src = msg.blob?.url
	ballon.href = msg.blob?.url

	messages.appendChild(item)
	messages.scrollTop = messages.scrollHeight
}

const sendMessage = async () => {
	if (!input.value && !filesButton.files[0]) return

	const text = input.value
	const blob = await getUrl(filesButton.files[0])
	const msg = { text, blob, fromID: userLogin.id, toID: userLogin.id === 1 ? 2 : 1 }

	socket.emit('chat message', { msg })
}

document.addEventListener('visibilitychange', function () {
	if (!shouldOut) return

	if (userLogin) {
		fetch('/hidden', {
			method: 'POST',
			body: JSON.stringify({ hidden: document.hidden, userID: userLogin.id }),
			headers: {
				'Content-Type': 'application/json',
			},
		})
	}

	if (document.hidden) {
		formLogin.parentElement.style.display = 'flex'
		//userLogin = null
		//messages.innerHTML = ''
	}
})

trigger?.addEventListener('mouseup', () => {
	mediaRecorder.stop()
	mediaRecorder.ondataavailable = (event) => {
		audioChuncks.push(event.data)
	}

	mediaRecorder.onstop = async () => {
		const audioBlob = new Blob(audioChuncks, { type: 'audio/webm' })
		audioChuncks.length = 0
		/*const reader = new FileReader()

		reader.onload = function () {
			const arrayBuffer = reader.result
			socket.emit('audio message', { arrayBuffer, fromID: userLogin.id, toID: userLogin.id === 1 ? 2 : 1 }) // Envia o áudio via socket
		}
		reader.readAsArrayBuffer(audioBlob)

		// Reproduzir localmente
		/*const audioUrl = URL.createObjectURL(audioBlob)
		audioPlayback.src = audioUrl
		console.log(audioUrl)*/

		const text = input.value
		const blob = await getUrl(audioBlob)
		const msg = { text, blob, fromID: userLogin.id, toID: userLogin.id === 1 ? 2 : 1 }

		socket.emit('chat message', { msg })
	}
})

const getUrl = (file) =>
	new Promise((resolve) => {
		if (!file) {
			resolve(null)
		}
		const reader = new FileReader()

		reader.onload = function () {
			const arrayBuffer = reader.result
			const type = file.type
			const blob = new Blob([arrayBuffer], { type })
			const name = file.name

			resolve({ blob, type, name })
		}

		reader.readAsArrayBuffer(file)
	})

const registerServiceWork = () => {
	Notification.requestPermission()
		.then(function (permission) {
			if (permission === 'granted') {
				if ('serviceWorker' in navigator && 'PushManager' in window) {
					navigator.serviceWorker
						.register('service-worker.js')
						.then(function (swReg) {
							console.log('Service Worker is registered', swReg)

							swReg.pushManager.getSubscription().then(function (subscription) {
								if (subscription === null) {
									// Usuário ainda não está inscrito
									subscribeUser(swReg)
								} else {
									sendSubscriptionToServer(subscription)
								}
							})
						})
						.catch(function (error) {
							console.error('Service Worker Error', error)
						})
				}

				function subscribeUser(swReg) {
					const applicationServerKey = urlB64ToUint8Array('BDRQy3Hko8dmp41t8-UMK1D2fMYU4Wq8NM0LgjaMp1eEt-4N9-7twTwBs8In-WfeFDRqR9pBwNnSz61StugL1JY')
					swReg.pushManager
						.subscribe({
							userVisibleOnly: true,
							applicationServerKey: applicationServerKey,
						})
						.then(function (subscription) {
							console.log('User is subscribed:', subscription)
							// Envie a subscription para o servidor aqui
							sendSubscriptionToServer(subscription)
						})
						.catch(function (err) {
							console.error('Failed to subscribe the user: ', err)
						})
				}

				function urlB64ToUint8Array(base64String) {
					const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
					const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
					const rawData = window.atob(base64)
					const outputArray = new Uint8Array(rawData.length)

					for (let i = 0; i < rawData.length; ++i) {
						outputArray[i] = rawData.charCodeAt(i)
					}
					return outputArray
				}

				async function sendSubscriptionToServer(subscription) {
					// Exemplo de envio da inscrição para o servidor usando fetch
					try {
						const response = await fetch('/subscribe', {
							method: 'POST',
							body: JSON.stringify({ subscription, userID: userLogin.id }),
							headers: {
								'Content-Type': 'application/json',
							},
						})
						if (!response.ok) {
							throw new Error('Failed to send subscription to server')
						}
						console.log('Subscription sent to server successfully')
					} catch (error) {
						console.error('Error sending subscription to server:', error)
					}
				}
			} else {
				console.log('Permission not granted for Notifications')
			}
		})
		.catch(function (error) {
			console.error('Error requesting notification permission:', error)
		})
}

filesButton.addEventListener('change', async () => sendMessage)

filesButton.addEventListener('click', () => {
	shouldOut = false
	setTimeout(() => (shouldOut = true), 30000)
})
