self.addEventListener('push', function (event) {
	const data = event.data.json()

	const options = {
		body: data.body,
		icon: data.icon,
		badge: data.badge,
	}

	event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener('notificationclick', function (event) {
	event.notification.close()
	event.waitUntil(
		clients.openWindow('/') // Abre o chat quando a notificação é clicada
	)
})
