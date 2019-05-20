"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const clientes_1 = require("./clientes");
const cliente_1 = require("./cliente");
class Server {
    constructor() {
        this.clientes = new clientes_1.Clientes();
        //Asignando todos los metodos y configuraciones de express a APP
        this.app = express_1.default();
        //Configuracion del cors
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', 'http://localhost:4200');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.header('Access-Control-Allow-Methods', 'GET, POST');
            res.header('Allow', 'GET, POST');
            next();
        });
        //Asignando la configuracion de express a httpServe porque express y sockets no tienen buena compartibilidad
        this.httpServer = new http_1.default.Server(this.app);
        //Asignando a la variable io la configuracion de sockets y a sockets se le asigna la configuracion del
        //http para hacer conexion entre sockets y express
        this.io = socket_io_1.default(this.httpServer);
        //Asignando el puerto del backend
        this.puerto = process.env.PORT || 3700;
        //Ejecutando la funcion asignarRutas 
        this.asignarRutas();
        //Ejecutando la funcion de escucharSockets
        this.escucharSockets();
        this.configurarBody();
    }
    configurarBody() {
        var bodyParser = require('body-parser');
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());
    }
    escucharSockets() {
        //Muestra en la consola del back osea el CMD este console log automaticamente cuando se carga el CMD
        //Porque se esta ejecutando la funcion en el constructor
        console.log("Escuchando los sockets");
        //io tiene la configuracion del socket con el intermedio de HTTP
        //Cuando a este le llega la funcion propia de sockets 'connect' le llega un callback con toda la data que sockets porporciona
        this.io.on('connect', (cliente) => {
            //Se crea un ojbCliente que va ser igual al modelo Cliente que tiene un id y un nombre y por parametros recibe un id
            //y aca se le pasa el id por medio de la data que llega de sockets en su propiedad id
            let objCliente = new cliente_1.Cliente(cliente.id);
            //En esta clase se creo una variable Clientes de tipo Clientes para acceder a todas sus funciones o metodos de la clase
            //Se hace uso de su funcion add que recibe un cliente de tipo cliente y como obj es de tipo cliente o cumple con el modelo
            //se le inserta y este a la vez hace un push al array lista añadiendo el cliente nuevo
            this.clientes.add(objCliente);
            //Se muestra en la consola del back CMD los siguientes console.log
            console.log("nueva lista de conectados");
            //Se muestra en la consola del back CMD la funcion de getClientes que retorna el array Lista
            console.log(this.clientes.getClientes());
            //Fin de la funcion connect del socket
            //Cuando se ejecuta el connect y este recibe una data que en este caso es cliente, asi como tiene propiedades de id y mas
            //tambien tiene una funcion propia de sockets que es disconnect que se ejecuta cuando este deja de usar el servicio
            //ejemplo cuando un cliente cierra el navegador se desconecta del servicio front y back, esta funcion no recibe nada en su callback
            cliente.on('disconnect', () => {
                //Cuando se ejecuta el disconnect muestra el console.log y se puede usar las propiedades del mismo cliente por ejemplo
                //el id entre otros atributos que tenga la data que envia sockets
                console.log(`El cliente ${cliente.id} se desconectó`);
                //Aqui se vuelve a usar la variable global clientes para acceder a su funcion remove que basicamente borra un cliente
                //cuando este se desconecta por medio de su id
                this.clientes.remove(cliente.id);
                //Aca esta enviando una respuesta al front con la funcion propia de sockets EMIT
                //Se le añade un nombre identificador de este EMIT separado por una coma se envia la data o lo que llegara al front
                //En este ckasi usa la variable clientes en su funcion getClientes que retorna la el array Lista
                this.io.emit('retorno-usuarios', this.clientes.getClientes());
            });
            //Fin de la funcion discconect
            //el cliente que esta conectado recibe un escucha ON del front que basicamente el front envia con el nombre de 
            //configurar-usuario y este recibe un callback con una data que el front envia
            cliente.on('configurar-usuario', (data) => {
                //se crea un nuevo objCliente que va ser igual a la clase Cliente o modelo Cliente que recibe un id 
                //y se le envia el id que llega en cliente
                let objCliente = new cliente_1.Cliente(cliente.id);
                //objCliente en su atributo nombre va ser igual a la data que le llegue del front en este caso le estan
                //enviando un nombre para asignarle o cambiarle al atributo nombre de la clase Cliente
                objCliente.nombre = data;
                //Aca se hace uso de la funcion update de la clase Clientes y como el update recibe un obj de tipo Cliente
                //se le envia objCliente que este almacena un nombre que se le envia del front
                //aca se llama a la funcion update de la clase clientes y como esta pide un objCliente de tipo Cliente 
                //Se le envia objCliente que almacena la data que se le envia del front en este caso un nombre
                //update busca en la lista 
                this.clientes.update(objCliente);
                //Muestra una nueva lista de conectados
                console.log("nueva lista de conectados");
                console.log(this.clientes.getClientes());
                //Emite la nueva lista de usuarios por la funcion getClientes que recibira el front con un FromEvent
                this.io.emit('retorno-usuarios', this.clientes.getClientes());
            });
            cliente.on('lista-usuarios', () => {
                this.io.emit('retorno-usuarios', this.clientes.getClientes());
            });
            cliente.on('enviar-mensaje', (mensaje) => {
                let objCliente = this.clientes.getClienteById(cliente.id);
                let content = {
                    mensaje: mensaje,
                    nombre: objCliente.nombre
                };
                this.io.emit('nuevo-mensaje', content);
                //Cuando el cliente quiere emitir un evento a todos los clientes conectados excepto asi mismo
                // cliente.broadcast.emit('nuevo-mensaje',content)
            });
        });
    }
    asignarRutas() {
        this.app.get('/', (req, res) => {
            res.send("Buenas");
        });
        this.app.post('/enviar-mensaje', (req, res) => {
            let { para, mensaje, de } = req.body;
            let content = {
                mensaje: mensaje,
                nombre: de
            };
            this.io.to(para).emit('nuevo-mensaje', content);
            res.status(200).json("Todo okey");
        });
    }
    start() {
        this.httpServer.listen(this.puerto, () => {
            console.log("Servidor corriendo exitosamente en el puerto "
                + this.puerto);
        });
    }
}
exports.default = Server;
