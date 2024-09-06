const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const webPush = require('web-push')
const { v4: uuidv4 } = require('uuid')
const fs = require('fs')
const { env } = require('process')
const files = []

const vapidKeys = {
	publicKey: 'BDRQy3Hko8dmp41t8-UMK1D2fMYU4Wq8NM0LgjaMp1eEt-4N9-7twTwBs8In-WfeFDRqR9pBwNnSz61StugL1JY',
	privateKey: '0j7Ynlj3YxifVjDpAoT6Tcj6xVdTJfwU56zgKDk1gWo',
}

webPush.setVapidDetails('mailto:divanirsilva@rionegronet.com.br', vapidKeys.publicKey, vapidKeys.privateKey)

const app = express()
const server = http.createServer(app)
const io = socketIo(server)
const messages = JSON.parse(fs.readFileSync('data.txt', { encoding: 'utf-8' }) || '[]').filter((message) => !message.blob?.type)
const limitDate = new Date()
limitDate.setDate(limitDate.getDate() - 5)

const PORT = env.PORT || 3000

const users = [
	{
		id: 1,
		name: '',
		password: '3006',
		hidden: true,
	},
	{
		id: 2,
		name: '',
		password: '5266',
		hidden: true,
	},
]
app.use(express.json())

app.use(express.static('public'))

setInterval(() => fs.writeFile('data.txt', JSON.stringify(messages), (error) => {}), 60000)

io.on('connection', (socket) => {
	console.log('A user connected')

	socket.on('chat message', (data) => {
		data.msg.time = new Date()
		const id = uuidv4()
		data.msg.id = id
		if (data.msg.blob) {
			files.push({
				buffer: Buffer.from(data.msg.blob.blob),
				name: data.msg.blob.name,
				type: data.msg.blob.type,
				id,
			})
			data.msg.blob.blob = null
			data.msg.blob.url = `/file/${id}`
		}
		io.emit('chat message', data)
		messages.push(data)
		users.forEach((user) => {
			if (user.id === data.msg.toID && user.hidden && user.subscription) {
				const payload = JSON.stringify({
					title: 'Nova Mensagem!',
					body: 'Você tem uma nova mensagem no chat.',
				})

				webPush.sendNotification(user.subscription, payload).catch((error) => {
					console.error('Error sending notification', error)
				})
			}
		})
	})

	socket.on('received-message', (id) => {
		messages.forEach((message) => {
			if (message.msg.id === id) {
				message.msg.received = new Date()
			}
		})
		/*socket.emit(
			'chat messages',
			messages //.filter((message) => message.msg.fromID === id || message.msg.toID === id)
		)*/
	})

	socket.on('id', (id) => {
		socket.emit(
			'chat messages',
			messages.filter((message) => (message.msg.fromID === id || message.msg.toID === id) && new Date(message.msg.time).getTime() > limitDate.getTime())
		)
	})

	socket.on('file upload', (file) => {
		/*const id = uuidv4()

		io.emit('file upload', file)
		file.push(file)*/
	})

	socket.on('disconnect', () => {
		console.log('User disconnected')
	})
})

app.post('/user', (req, res) => {
	const user = users.find((user) => user.password === req.body.password)
	//user?.password = null
	res.send(user)
})

app.post('/subscribe', (req, res) => {
	const { subscription, userID } = req.body
	users.forEach((user) => {
		if (user.id === userID) {
			user.subscription = subscription
		}
	})
	res.send({ subscription, userID })
})

app.post('/hidden', (req, res) => {
	const { hidden, userID } = req.body
	users.forEach((user) => {
		if (user.id === userID) {
			user.hidden = hidden
			if (hidden) {
				user.status = `Visto por último: ${formatDate(new Date())}`
			} else {
				user.status = 'Online'
			}
		}
	})

	io.emit(
		'status',
		users.map((user) => {
			const { status, id } = user
			return { status, id }
		})
	)
	res.send({ hidden, userID })
})

app.get('/file/:id', (req, res) => {
	const file = files.find((file) => file.id === req.params.id)

	if (file) {
		res.setHeader('Content-Type', file.type)
		res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`)
		res.send(file.buffer) // Envia o arquivo como resposta
	} else {
		res.status(404).send('File not found or expired')
	}
})

const formatDate = (date) => {
	const dt = new Date()
	const today = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0)
	const yesterday = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - 1, 0, 0, 0, 0)
	const dateCompare = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)

	if (dateCompare.getTime() === today.getTime()) {
		return date.toLocaleTimeString()
	}
	if (dateCompare.getTime() === yesterday.getTime()) {
		return 'Ontem as ' + date.toLocaleTimeString()
	}
	return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

server.listen(PORT, () => {
	console.log(`listening on *:${PORT}`)
})
