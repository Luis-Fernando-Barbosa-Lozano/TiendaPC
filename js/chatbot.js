document.addEventListener('DOMContentLoaded', function () {
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');

    const intenciones = {
        información: ["qué es", "que es", "definición", "cómo funciona", "definicion", "informacion", "busqueda", "buscar", "analizar"],
        recomendaciones: ["recomienda", "sugiere", "mejor opción"],
        compra: ["dónde comprar", "quiero comprar", "enlaces de compra", "dame opciones", "comprar", "dame", "donde puedo comprar", "encuentro"]
    };

    let respuestas;

    fetch('../js/respuestas.json')
        .then(response => response.json())
        .then(data => {
            respuestas = data;
        })
        .catch(error => console.error('Error al cargar el archivo JSON:', error));

    function addMessage(sender, message, links = []) {
        const messageElement = document.createElement('div');
        messageElement.className = `chatbot-message ${sender}`;

        if (sender === 'bot') {
            const image = document.createElement('img');
            image.src = '../images/romina.png';
            image.alt = 'Avatar de Romina';
            image.className = 'romina-image';

            const textElement = document.createElement('p');
            textElement.textContent = message;

            messageElement.appendChild(image);
            messageElement.appendChild(textElement);

            if (links.length > 0) {
                const linksContainer = document.createElement('div');
                linksContainer.className = 'chatbot-links';
                links.forEach(link => {
                    const linkElement = document.createElement('a');
                    linkElement.href = link.link;
                    linkElement.textContent = link.title;
                    linkElement.target = '_blank';
                    linksContainer.appendChild(linkElement);
                });
                messageElement.appendChild(linksContainer);
            }
        } else {
            const textElement = document.createElement('p');
            textElement.textContent = message;
            messageElement.appendChild(textElement);
        }

        const chatbotMessages = document.getElementById('chatbot-messages');
        chatbotMessages.appendChild(messageElement);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }


    function normalizarTexto(texto) {
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s]/g, "");
    }

    function calcularSimilitud(a, b) {
        const matriz = Array(a.length + 1)
            .fill(null)
            .map(() => Array(b.length + 1).fill(null));

        for (let i = 0; i <= a.length; i++) matriz[i][0] = i;
        for (let j = 0; j <= b.length; j++) matriz[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const costo = a[i - 1] === b[j - 1] ? 0 : 1;
                matriz[i][j] = Math.min(
                    matriz[i - 1][j] + 1,
                    matriz[i][j - 1] + 1,
                    matriz[i - 1][j - 1] + costo
                );
            }
        }
        const distancia = matriz[a.length][b.length];
        return 1 - distancia / Math.max(a.length, b.length);
    }

    function detectarIntencion(mensaje) {
        mensaje = normalizarTexto(mensaje);
        const palabrasUsuario = mensaje.split(/\s+/);

        for (let [intencion, palabrasClave] of Object.entries(intenciones)) {
            for (let palabraClave of palabrasClave) {
                const palabraNormalizada = normalizarTexto(palabraClave);

                for (let palabraUsuario of palabrasUsuario) {
                    const similitud = calcularSimilitud(palabraUsuario, palabraNormalizada);
                    if (similitud > 0.4) {
                        return intencion;
                    }
                }
            }
        }
        return "desconocido";
    }

    async function getBotResponse(userMessage) {
        const intencion = detectarIntencion(userMessage);
        let botMessage;
        let links = [];

        switch (intencion) {
            case 'información':
                const keyword = userMessage.split(" ").pop().toLowerCase();
                botMessage = respuestas.información.definiciones[keyword] || respuestas.desconocido;
                break;
            case 'recomendaciones':
                const precios = userMessage.match(/\d+/g)?.map(Number);
                if (!precios || precios.length === 0) {
                    botMessage = "No entendí el rango de precios. Por favor, intenta de nuevo con un precio o un rango como '20000 a 30000'.";
                    break;
                }

                let rangoPrecios = precios.length === 1
                    ? [precios[0], precios[0]]
                    : [Math.min(...precios), Math.max(...precios)];

                const productoTipo = userMessage.includes("grafica") ? "grafica" : "procesador";
                const productos = respuestas.recomendaciones[productoTipo].filter(producto =>
                    producto.precio >= rangoPrecios[0] && producto.precio <= rangoPrecios[1]
                );

                botMessage = productos.length > 0
                    ? "Te recomiendo los siguientes productos:\n" + productos.map(p => `${p.nombre}: $${p.precio}`).join('\n')
                    : `No encontré productos en el rango de precios de $${rangoPrecios[0]} a $${rangoPrecios[1]}.`;
                break;
            case 'compra':
                addMessage('bot', "Déjame buscar opciones para ti...");
                const resultados = await buscarEnlaces(userMessage);
                botMessage = resultados.length > 0
                    ? "Aquí tienes algunas opciones:"
                    : "No pude encontrar resultados relevantes.";
                links = resultados;
                break;
            default:
                botMessage = respuestas["desconocido"];
        }

        addMessage('bot', botMessage, links);
    }

    async function buscarEnlaces(query) {
        try {
            const response = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error("Error en la búsqueda.");
            const data = await response.json();
            return Array.isArray(data) ? data : []; // Asegúrate de que sea un array
        } catch (error) {
            console.error("Error al buscar enlaces:", error);
            return [];
        }
    }


    function enviarMensaje() {
        const userMessage = chatbotInput.value;
        if (userMessage.trim() !== '') {
            addMessage('user', userMessage);
            chatbotInput.value = '';
            getBotResponse(userMessage);
        }
    }

    chatbotSend.addEventListener('click', enviarMensaje);
    chatbotInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            enviarMensaje();
        }
    });
});
