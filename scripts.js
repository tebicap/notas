alert("HOLA! estoy en script.js");
// estatus variables
var escrituralibre = true; // escritura libre desplegada
var eliminarlibros = "none"; // no se muestra globito para eliminar libro
var num = 0; //solo para testear con la consola
var boton_presionado = "";
var textarea_validado = "no_requerido"; // validad mínimo 5 palabras, posibles estados: no_requerido, requerido_true, requerido_false
var nodo = null;
var borrame = ""; // borrar

var menu = false;

var nombre_libro_actual = "";
const introdiccionario = "|||settings_notas_app_dictionary=";
const defaultdiccionario = '{"line":"no"}';
var nota_de_bienvenida = "Bienvenido!   Welcome!   ברוך הבא!   Benvingut!   Bienvenue!   Selamat datang!   اهلا!";

// notas variables
var nota_expandida= false;
var nota_modo_editar = false;
var nota_original = ""; // sirve para revertir nota
var nota_eliminando = false;
var nota_esnueva = false;
var notas_cantidad = 0; // cantidad de notas en un libro
var nota_actual = null; // nota expandiendo y editando

// dialogo dialogo confirmacion
const dialogo_confirmacion = {};
dialogo_confirmacion.result = null;

// indicadores reordenar notas
var nota_statusmover = "no"; // guarda estado de la funcion de reordenar notas
var nota_statusreordenando = false; // Previene volver a reodernar mientras se reordenan notas
var nota_mueveestanota = null; // nota a mover/reordenar
var indicador = ""; // cargo linea indcadora de reordenamiento más tarde
var nota_movercasilleros = 0; // casirrelos a mover


var altura_elementos = 0; // para hacer restar y calcular tamaños
var escrituralibre_orig = "0px" // en pixels, guardo altura original de escritura libre
var escrituralibre_min = 0; // integral, guardo tamaño escritura libre minimizado

//Set notas default
///////////////////

const notas = {};
notas.appversion = "0.1";
notas.libros = {"Mis Notas": [nota_de_bienvenida+introdiccionario+defaultdiccionario]};

// estado app
const estadoapp = {};
notas.appversion = "0.1";
estadoapp.version = "0.1";
estadoapp.escrituralibre = true;
estadoapp.pantalla= "notas"; // notas o biblioteca
estadoapp.acento = "#7293d7";
estadoapp.acento_rotate = "220deg";
estadoapp.acento_reset = "#7293d7";

// tamaño de algunos elementos, preparo
var altura_header = "0px";
var altura_notas_encabezado = "0px";
var altura_escritura_libre = "0px";
var altura_footer = "0px";


// CARGO LIBROS
///////////////

function inicializarApp() {
    if ( test = window.localStorage.getItem('app_notas_libros') ){ // Compruebo sí hay libros        
        let libros_default_backup = notas.libros;
        
        // leo storage notas
        let notas_temp = JSON.parse( window.localStorage.getItem('app_notas_libros') ); //recupero notas y más
        notas.appversion = notas_temp.appversion;
        notas.libros = notas_temp.libros;
        
        // escribo libro por default si no hay libros (previene fallo por falta de libros)
        if(Object.keys(notas.libros).length == 0){
            notas.libros = libros_default_backup;
            window.localStorage.setItem('app_notas_libros', JSON.stringify(notas)); //salvo a disco notas
        }
        
        // leo storage estado app
        let estadoapp_temp = JSON.parse(window.localStorage.getItem('app_notas_estado'));
        estadoapp.version = estadoapp_temp.version;
        estadoapp.escrituralibre = estadoapp_temp.escrituralibre;
        estadoapp.pantalla= estadoapp_temp.pantalla;
        estadoapp.acento = estadoapp_temp.acento;
        estadoapp.acento_rotate = estadoapp_temp.acento_rotate;
    } else {
        // no había libros, salvo default a localStorage
        window.localStorage.setItem('app_notas_libros', JSON.stringify(notas)); //salvo a disco notas
        window.localStorage.setItem('app_notas_estado', JSON.stringify(estadoapp)); //salvo a disco estadoapp
    }
    // guardo dialogo de confirmacion en variable
    dialogo_confirmacion.dialogo = document.querySelector("div.mensajes");
    
    escribeHTML_notas();    
    
    calcula_alturas(); // para hacer calculos después
    valores_originales(); // guardo valores originales
    
    // seteo color app
    document.getElementById("selector_color_app").value = estadoapp.acento;
    set_color_app(estadoapp.acento);
    
    // voy a pantalla guardada
    if (estadoapp.pantalla == "biblioteca"){
        mostrar_biblioteca();
    }
}



// VARIOS
///////////////


async function encriptar(mensaje, palabras_clave) {
  // Convert palabras_clave to a TypedArray
  const palabras_claveArray = new TextEncoder().encode(palabras_clave);

  // Use a KDF to generate a 256-bit key from the password
  // genero clave corta a partir de las palabras clave, sino no lo toma para encriptar
  const key = await crypto.subtle.importKey(
    'raw',
    palabras_claveArray,
    { name: 'PBKDF2' },
    false,
    ["deriveKey"]
  );
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(0),
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );
  console.log("enc_deriveKey:");
  console.log(derivedKey);
  
  
  // Generate a random initialization vector (IV)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  console.log("enc_iv:");
  console.log(iv);
  
  //agrego timestamp al mensaje
  let timestamp = Date.now(); // genero timestamp
  mensaje = mensaje+"***timestamp:"+timestamp;
  
  // Convert the string to a TypedArray
  const stringArray = new TextEncoder().encode(mensaje);

  // Encrypt the string
  let encryptedArray = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    derivedKey,
    stringArray
  );

  encryptedArray = new Uint8Array(encryptedArray); // convierto a Uint8array
  
  // Concatenate the IV and the encrypted string and return them as a single array
  const nuevoU8Array = new Uint8Array(iv.length + encryptedArray.length); // uint8array final
  nuevoU8Array.set(iv, 0); // agrego array iv
  nuevoU8Array.set(encryptedArray, iv.length); // agrego array mensaje encriptado
  
  return nuevoU8Array;
}

async function desencriptar(mensaje, palabras_clave) {
    // Extract the IV from the start of the mensaje
    const iv = mensaje.slice(0, 12);
    console.log("des_iv:");
    console.log(iv);
    
    // Convert the palabras_clave to a TypedArray
    const palabras_claveArray = new TextEncoder().encode(palabras_clave);
    // genero clave corta a partir de las palabras clave, sino no lo toma para encriptar
    const key = await crypto.subtle.importKey(
        'raw',
        palabras_claveArray,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    const derivedKey = await crypto.subtle.deriveKey(
        {
        name: 'PBKDF2',
        salt: new Uint8Array(0),
        iterations: 100000,
        hash: 'SHA-256',
        },
        key,
        { name: 'AES-GCM', length: 256 },
        true,
        ['decrypt']
    );
    console.log("des_deriveKey:");
    console.log(derivedKey);
    
    console.log("A continuación desencriptando...");
    // Decrypt the string
    const decryptedArray = await crypto.subtle.decrypt(
        {
        name: 'AES-GCM',
        iv: iv,
        },
        derivedKey,
        mensaje.slice(12)
    );
        console.log("esto de arriba tiene algo mal?");

    // Convert the decrypted array to a string
    let decodificado = new TextDecoder().decode(decryptedArray);
    let timestamp = decodificado.match(/\*\*\*timestamp:\d+/);
    let solo_mensaje = decodificado.slice(0, -timestamp[0].length);
        
    return [timestamp, solo_mensaje]
}

function textarea_palabrasclave_validar (textarea) {
    const regex = /\w+ \w+ \w+ \w+ \w+/; // buscar patron
    if (textarea.value.match(regex) != null) {
        document.querySelector("div.mensajes_si").style.backgroundColor = "";
        textarea_validado = "requerido_true";
    } else {
        document.querySelector("div.mensajes_si").style.backgroundColor = "#aaaaaa";
        textarea_validado = "requerido_false";
    }
}

function textarea_palabrasclave_recibelimpiar(textarea) {
    let text = textarea.value.replace(/  /g, ' '); // elimino doble espacios
    text = text.replace(/  /g, ' '); // segunda pasada (alimino más espacios)
    const regex = /(\w+ ){5,}\w{46,}/; //buscar patron
    let palabras_cid = text.match(regex);
    if (palabras_cid != null) {
        console.log(palabras_cid[0]);
        
        document.querySelector("div.mensajes_si").style.backgroundColor = "";
        textarea_validado = "requerido_true";
    } else {
        document.querySelector("div.mensajes_si").style.backgroundColor = "#aaaaaa";
        textarea_validado = "requerido_false";
    }
    return palabras_cid[0];
}

function set_color_app(color){
    let hsl = hexToHsl(color); // de Hexadecimal a HSL
    let huerotation = Math.round(hsl[0]);
    document.documentElement.style.setProperty('--acento', color); // set color
    document.documentElement.style.setProperty('--acento_rotate', huerotation+"deg"); // set rotacion hue
    
    // salvar a var
    estadoapp.acento = color;
    estadoapp.acento_rotate = huerotation+"deg";
    
    //salvar a localStorage
    window.localStorage.setItem("app_notas_estado", JSON.stringify(estadoapp));
}

function hexToHsl(hex) {
  // Convert the hexadecimal color to the RGB color space
  let r = parseInt(hex.substring(1, 3), 16) / 255;
  let g = parseInt(hex.substring(3, 5), 16) / 255;
  let b = parseInt(hex.substring(5, 7), 16) / 255;

  // Find the maximum and minimum values of r, g, and b
  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);

  // Calculate the hue value
  let h = (max + min) / 2;
  if (max === min) {
    h = 0;
  } else if (max === r) {
    h = (60 * (g - b) / (max - min)) + 0;
  } else if (max === g) {
    h = (60 * (b - r) / (max - min)) + 120;
  } else if (max === b) {
    h = (60 * (r - g) / (max - min)) + 240;
  }
  if (h < 0) {
    h += 360;
  }

  // Calculate the saturation and lightness values
  let s = (max + min) / 2;
  let l = (max + min) / 2;
  if (max === min) {
    s = 0;
    l = (r + g + b) / 3;
  } else {
    s = (max - min) / (1 - Math.abs(2 * l - 1));
    l = (r + g + b) / 3;
  }

  // Return the HSL color as an array
  return [h, s, l];
}

function escribeHTML_notas(){
    // eliminar notas viejas
    eliminanotas_html();
    
    // actualizo variable cantidad de notas
    let nombreprimerlibro = Object.keys(notas.libros)[0];
    notas_cantidad = notas.libros[nombreprimerlibro].length;
    
    //obtengo nombre libro
    nombre_libro_actual = Object.keys(notas.libros)[0];
    
    // actualizo nombre en el html y agrego notas del 1er libro
    update_nombrelibro(nombre_libro_actual);
    agregarnotas_html(notas.libros[nombre_libro_actual]);
    
    // añadir eventode arrastre a las flamantes notas
    cargo_eventos_arrastre();
        
    // escribo libros existentes en biblioteca
    biblioteca_borralibrosviejos(); // primero borro libros
    biblioteca_escribelibros();
    
    // en base a Estadoapp restauro algunos valores
    if (estadoapp.escrituralibre == false){
        estadoapp.escrituralibre = true; // la paso como a true para que se cierre
        escrituralibre_minimiza();
    }
}


function valores_originales(){
    escrituralibre_orig = document.querySelector("section.escritura_libre");
    escrituralibre_orig = window.getComputedStyle(escrituralibre_orig).getPropertyValue('height');
}


// obtener altura de los elementos (para después restarla)
function calcula_alturas() {
    altura_header = document.querySelector("section.header");
        altura_header = window.getComputedStyle(altura_header).getPropertyValue('height');
    
    altura_notas_encabezado = document.querySelector("div.notas_encabezado_contenedor");
        let padding = window.getComputedStyle(altura_notas_encabezado).getPropertyValue('padding');
        altura_notas_encabezado = window.getComputedStyle(altura_notas_encabezado).getPropertyValue('height');
        altura_notas_encabezado = parseInt(altura_notas_encabezado.slice(0,-2)) + (parseInt(padding.slice(0,-2)) * 2);
        altura_notas_encabezado += "px";
        
    altura_escritura_libre = document.querySelector("section.escritura_libre");
        altura_escritura_libre = window.getComputedStyle(altura_escritura_libre).getPropertyValue('height');
    
    altura_footer = document.querySelector("section.footer");
        altura_footer = window.getComputedStyle(altura_footer).getPropertyValue('height');
    
    //console.log("altura_header: "+altura_header);
    //console.log("notas_encabezado: "+altura_notas_encabezado);
    //console.log("escritura_libre: "+altura_escritura_libre);
    //console.log("footer: "+altura_footer);
    
    // suma altura header footer etc
    altura_elementos = parseInt(altura_header.slice(0,-2)) + parseInt(altura_notas_encabezado.slice(0,-2)) + parseInt(altura_escritura_libre.slice(0,-2)) + parseInt(altura_footer.slice(0,-2));
    
    let altura_elementos_array = [ parseInt(altura_header.slice(0,-2)), parseInt(altura_notas_encabezado.slice(0,-2)), parseInt(altura_escritura_libre.slice(0,-2)), parseInt(altura_footer.slice(0,-2)) ];
    
    return altura_elementos_array
}

// actualizo nombre libro HTML
function update_nombrelibro(nombrelibro){
    document.querySelector("span.notas_titulo").innerHTML = nombrelibro;
}

// Eliminar notas del HTML (eliminar solo el html)
function eliminanotas_html () {
    document.querySelectorAll("div.nota:not(.notamodelo)").forEach((elemento) => {
        elemento.remove();
    });
}

// append nota al html
function nota_append_html (txt, nuevanota, i) {
    //separo nota de diccionario
    let txt_split = separar_nota_dic(txt); // separo nota de diccionario
    let div = document.querySelector("div.notamodelo").cloneNode(true);
    div.id = "nota_" + i;
    div.classList.remove("notamodelo");
    div.style.display = ""; //estp no seee
    div.childNodes[3].innerHTML = txt_split[0];
    
    // leo diccionario
    let diccionario = JSON.parse(txt_split[1]);    
    if (diccionario["line"]=="yes") {
        div.childNodes[3].style.textDecoration = "line-through"; //tachado
    }
    
    if (nuevanota == "nueva"){ //compruebo quiero agregar una sola nota al principio
        document.querySelector("div.notamodelo").after(div);
        reescribir_id_notas_html(); // reemplazo IDs
    } else {
        document.getElementById("notas_contenedor").appendChild(div);
    }
}

function reescribir_id_notas_html(){
    let i = 0;
    document.querySelectorAll("div.nota").forEach((estanota) => {
        if (i == 0) { i++; return } //no seteo la nota modelo
        estanota.id = "nota_"+(i-1); //resto 1 para emepzar desde cero
        i++;
    });
}

// agregar libro al html
function agregarnotas_html (libro) {
    let i = 0;
    libro.forEach((elemento) => {
        nota_append_html(elemento, "", i);
        i++;
    });
}

// copiar a portapapeles
function copiar_a_portapapeles(origen) {
    var el_texto = "";
    
    //detecto qué es lo que quiero copiar
    if (origen == "escrituralibre"){
        el_texto = event.target.parentNode.previousElementSibling.value;
    } else if (origen == "nota"){
        el_texto = event.target.parentNode.parentNode.childNodes[3].innerText;
    } else if (origen == "enviomensaje_palabrasclave") {
        el_texto = document.querySelector("textarea.textarea_palabrasclave").value;
    }
    
    // creo un input auxiliar para copiarlo despues
    let aux = document.createElement("input");
    aux.setAttribute("value", el_texto);
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    document.body.removeChild(aux);
    
    if (el_texto == ""){
        mostrarpopup(event.target, "vacío", 'var(--alerta_rojo)');
        return
    } else {
        mostrarpopup(event.target, "copiado!", 'var(--acento)');
    }
}

// mostrar popup de copiado
function mostrarpopup(elemento, txt, bg_color) {
    let coordenadasYwidth = getPos(elemento);
    
    let popup = document.createElement("div");
    popup.innerText = txt;
    popup.style.color = "white";
    popup.style.padding = "5px 8px 5px 8px";
    popup.style.borderRadius= "5px";
    popup.style.backgroundColor = bg_color;
    popup.style.position = "absolute";
    popup.style.left = coordenadasYwidth[0]+"px";
    popup.style.top = coordenadasYwidth[1]+"px";
    
    document.body.appendChild(popup);
    
    // calculo margin left
    let width_popup = window.getComputedStyle(popup, null).getPropertyValue("width");
    let half_width_popup = (parseInt(width_popup)+16)/2; // le sumo el padding a lo ancho, porque no hace parte del computed width
    let half_width_boton = parseInt(coordenadasYwidth[2])/2;
    popup.style.marginLeft = (half_width_boton - half_width_popup) + "px";
    //popup.style.marginTop = "-50px";
    popup.classList.add("copiado_anim");
    
    setTimeout(()=>{popup.remove()},1400);
}

// obtener posicion de un elemento
function getPos(elemento){
    let boton_width = window.getComputedStyle(elemento, null).getPropertyValue("width");
    let boton_padding = window.getComputedStyle(elemento, null).getPropertyValue("padding-left"); // el padding no se cuenta como width, lo agrego
    let boton_total_width = parseInt(boton_width)+parseInt(boton_padding)*2;
    var x=0;
    var y=0;
    while(true){
        x += elemento.offsetLeft;
        y += elemento.offsetTop;
        if(elemento.offsetParent === null){
            break;
        }
        elemento = elemento.offsetParent;
    }
    return [x, y, boton_total_width];
}



// ESCRITURA LIBRE
///////////////////

// minimiza escritura libre
function escrituralibre_minimiza(){
    if (estadoapp.escrituralibre == true) {
        let escrituralibre_nuevo = 27; // pixels
        escrituralibre_min = escrituralibre_nuevo; // para usar en otras funciones
        const escrituralibre_section = document.querySelector("section.escritura_libre");
        escrituralibre_section.style.height= escrituralibre_nuevo + "px"; // Achico sección
        escrituralibre_section.style.overflow= "hidden"; // overfloww hidden
        document.querySelector("div.escritura_libre_botones").style.display = "none"; // oculto botones
        document.querySelector("img.escritura_libre_mini-maxi").style.transform= "rotate(180deg)"; // rotar icono
        document.querySelectorAll("section.main")[0].style.bottom = "69px"; //agrando main 84 pixels
        estadoapp.escrituralibre = false; // salvo a var
        
        // actualizo tamaño de nota si está expandida
        if (nota_expandida == true){
            let restar = altura_elementos - (escrituralibre_orig.slice(0,-2) - escrituralibre_nuevo) +10; // 10 de gap
            restar += "px";
            nota_actual.style.height = "calc(100vh - " + restar + ")"; // seteo altura de nota
            //ajusto posicion botonera de edicion
//             nota_actual.children[4].style.bottom = "0px";
        }        
        // GUARDAR ESTADO en storage
        window.localStorage.setItem('app_notas_estado', JSON.stringify(estadoapp)); //salvo a disco
    } else {
        event.target.parentNode.parentNode.style.height = escrituralibre_orig; // altura escrituralibre abierto
        document.querySelector("div.escritura_libre_botones").style.display = "";
        event.target.style.transform= ""; // no-rotar icono
        document.querySelectorAll("section.main")[0].style.bottom = ""; //restauro main
        estadoapp.escrituralibre = true;
        
        // actualizo tamaño de nota si está expandida
        if (nota_expandida == true){
//             calcula_alturas();
            let restar = altura_elementos + 10; // achico, 10px de gap
            restar += "px";
            nota_actual.style.height = "calc(100vh - " + restar + ")"; // seteo altura de nota
            //ajusto posicion botonera de edicion
//             nota_actual.children[4].style.bottom = "18px";
        }
        // GUARDAR ESTADO en storage
        window.localStorage.setItem('app_notas_estado', JSON.stringify(estadoapp)); //salvo a disco
    }
}

// borrar contenidod de escritura libre
function escrituralibre_borrar() {
    event.target.parentNode.previousElementSibling.value = "";
}

// Pegar desde portapapeles (deshabilitado)
function escrituralibre_pegar() {
    var copiar_aqui = event.target.parentNode.previousElementSibling;
    navigator.clipboard.readText().then(
        (textocopiado) => {
            copiar_aqui.value = textocopiado;
        });  
}

// Pegar desde portapapeles PRUEBA (deshabilitado)
function escrituralibre_pegar_prueba() {
    var copiar_aqui = event.target.parentNode.previousElementSibling;
    
    setTimeout( // no sé por qué pero sin el timeout no funca
    async () => {
    const text = await navigator.clipboard.readText();
    copiar_aqui.value = text;
    }
    , 200);
}


    
// NOTAS
/////////////

async function masbotones(target, expa_contra){
    let botonera = target;
    if (expa_contra == "expandir"){
        botonera.style.display = "none"; // oculto botón expandir
        botonera.style.opacity = "0"; // opacity 0, para animacion en confirmar nota
        botonera.nextElementSibling.style.right = "0px"; // desplazo botones a dentro de pantalla
        botonera.nextElementSibling.style.opacity = "1.0"; // visibilizo
    } else {
        if (expa_contra == "minimizanota") {
        botonera = nota_actual.children[3].firstChild;
        }
        botonera.parentNode.style.right = "-200px"; // desplazo botones a fuera
        botonera.parentNode.style.display = "0.0"; // invisibilizo
        setTimeout(()=>{
            botonera.parentNode.previousElementSibling.style.opacity = "1"; // visibilizo boton expandir
            botonera.parentNode.previousElementSibling.style.display = ""; // muestro boton expandir
        }, 2000);
    }
}

// NOTAS Funciones de arrastre
//////////////////////////////

function inicioarrastre(event) {
    //event.stopPropagation();
    document.getElementsByClassName("main")[0].addEventListener('touchmove', finarrastre); // añado evento a main sólo si empecé a arrastrar
    if (nota_statusmover == "moviendo" || nota_statusreordenando == true || nota_modo_editar == true) {
        document.getElementsByClassName("main")[0].removeEventListener('touchmove', finarrastre); // quito evento a main (para que se pueda scrollear las notas)
        return
    }
    //console.log("*************INICIO");
    nota_statusmover = "si";
    nota_mueveestanota = event.target.parentNode;
    lastMove = event.clientY;
}
function finarrastre(event) {
    event.preventDefault();
    if (nota_statusmover == "no" || event.clientY == undefined) {return}
    //console.log("*************MOVIENDO");
    nota_statusmover = "moviendo";
    var posicion_actual = event.clientY;
    distancia = posicion_actual - lastMove;
    indicador.style.top= posicion_actual+"px"; // posiciono indicador de arrastre
    indicador.style.display= "inherit"; // visibilizo indicador de arrastre
    nota_movercasilleros = Math.trunc(distancia/43); // casilleros a mover; 43 es la altura de cada nota
}
function sueltotouch(event) {
    if (nota_statusmover == "no" || nota_statusreordenando == true) {return}
    //console.log("*************SOLTANDO");
    document.getElementsByClassName("main")[0].removeEventListener('touchmove', finarrastre); // quito evento a main (para que se pueda scrollear las notas)
    indicador.style.display= "none"; // in-visibilizo indicador de arrastre
    nota_statusmover = "no"; // vuelve al principio
    if (nota_movercasilleros > 0 || nota_movercasilleros < 0) {
        nota_statusreordenando = true; // prevenir seguir reodenando
        console.log("Sí reordeno "+nota_movercasilleros+" casilleros!");
        mover_nota(nota_movercasilleros);
    }
}

// NOTAS Cargo EVENTOS DE ARRASTRE
//////////////////////////////////

function cargo_eventos_arrastre() {
    indicador = document.querySelector(".indicador_movernota"); // seleccionno indicador de reordenamiento
    main = document.getElementsByClassName("main")[0];
    var lastMove = null;
    
    // Salvo posición inicial de touch, inicio reordenamiento en ICONOS de arrastre
    let arrastrados= document.querySelectorAll("img.arrastre");
    arrastrados.forEach((elemento) => {
        elemento.addEventListener('pointerdown', inicioarrastre);
    });
    
    // Detecto movimiento y arrastre (en sección MAIN)
    main.addEventListener('pointermove', finarrastre);
    //main.addEventListener('touchmove', finarrastre);
    
    // Detecto punero no activo en sección MAIN
    arrastrados.forEach((elemento) => {
        main.addEventListener('pointerup', sueltotouch);
    });
    
    arrastrados.forEach((elemento) => { // cancelado por el nvegador
        main.addEventListener('pointercancel', sueltotouch);
    });
    
    arrastrados.forEach((elemento) => { // dejo de clickear
        main.addEventListener('mouseup', sueltotouch);
    });
    
    arrastrados.forEach((elemento) => { // dejo de dragear (lo toma como click)
        main.addEventListener('click', sueltotouch);
    });
}

// mover notas
function mover_nota (casilleros) {
    //obtengo número de nota
    let nro_de_nota = parseInt(nota_mueveestanota.id.slice(5,)) + 1; // nota número (1 más que ID)
    let notas_length = notas.libros[nombre_libro_actual].length; // cantidad de notas
    
    let nueva_posicion = nro_de_nota + casilleros; // resta automaticamente
    
    // limito nueva posición entre Cero y Maximo de notas
    if (nueva_posicion < 1) {
        nueva_posicion = 1;
    } else if (nueva_posicion > notas_length) {
        nueva_posicion = notas_length;
    }
    
    if (nueva_posicion == nro_de_nota){ // si la nota está en le mismo lugar salgo
        nota_statusreordenando = false; // restauro var
        return
    }
    
    // reordenar notas en variable temporal
    let nota_origen_index = nro_de_nota - 1;
    let nota_origen = notas.libros[nombre_libro_actual][nota_origen_index]; // salvar nota a mover
    let nota_destino_index = nueva_posicion-1;
    let nota_destino = notas.libros[nombre_libro_actual][nota_destino_index]; // salvar nota destino
    var lista_ordenada = [];
    notas.libros[nombre_libro_actual].forEach( (item, i, lista) => {
        if (i == nota_origen_index){
            return
        } else if (i == nota_destino_index) {
            if (casilleros < 0) {
                lista_ordenada.push(nota_origen, nota_destino);
            } else {
                lista_ordenada.push(nota_destino, nota_origen);
            }
        } else {
            lista_ordenada.push(item);
        }
    });
    
    // salvo variable notas
    notas.libros[nombre_libro_actual] = lista_ordenada;
    
    // reordenar HTML
    document.querySelectorAll("div.nota_txt").forEach((item, i)=>{
        if (i == 0){return} // no proceso nota modelo
            let estanota = lista_ordenada[(i-1)];
            //separo nota de diccionario
            let string_txt = estanota.slice( 0, estanota.indexOf(introdiccionario) );
            let string_dic = estanota.slice(estanota.indexOf(introdiccionario)+33, );
            let parse_dic = JSON.parse(string_dic);
            //escribo htmnl
            item.innerText = string_txt;
            // aplico estilos
            if (parse_dic["line"]=="yes") {
                item.style.textDecoration = "line-through";
            } else{
                item.style.textDecoration = ""; // quito estilo si corersponde
            }
    });
    
    window.localStorage.setItem('app_notas_libros', JSON.stringify(notas)); //salvo a disco
    
    // coloreo para ubicar nota nueva
    let notadestinocolor = document.querySelectorAll("div.nota")[nota_destino_index+1]; // +1 para saltar notamodelo
    notadestinocolor.style.backgroundColor = "var(--acento)"; // coloreo para ubicarla dácil
    notadestinocolor.children[1].style.color = "#ffffff"; // coloreo para ubicarla dácil
        
    // quito color
    setTimeout(() => {
        notadestinocolor.style.backgroundColor = ""; // quito color
        notadestinocolor.children[1].style.color = ""; // quito color
        }, 700);
    
    nota_statusreordenando = false; // restauro var
}

// agregar nota
function agregar_nota(boton_notanueva){
    nota_esnueva = true;
    let string = introdiccionario + JSON.stringify({line:"no"});
    nota_append_html(string, "nueva"); //agrego html
    let expande_nota = boton_notanueva.parentNode.nextElementSibling.nextElementSibling.nextElementSibling
    expandir_nota_edicion(expande_nota, "nuevanota");
    cargo_eventos_arrastre(); //para la flamante nota
}

function expandir_nota(expande_nota, motivo) {
    if (motivo == "nuevanota") {
        nota_actual = expande_nota;
    } else {
        nota_actual = expande_nota.target.parentNode.parentNode;
    }
    
    let extra = 0;
    if (estadoapp.escrituralibre == false){ // compruebo si hay que achicar menos
        extra = parseInt( escrituralibre_orig.slice(0,-2) ) - escrituralibre_min;
    }
//     let restar = altura_elementos + 26 + extra; //achico un poco
    let restar = altura_elementos - extra + 10; //achico, 10px de gap
    restar += "px";
    nota_actual.style.height = "calc(100vh - " + restar + ")"; // seteo altura de nota
    
    // scroll to top
    document.querySelector("div.notas_contenedor").scrollIntoView({behavior: "smooth"})
    
    // oculta notas anteriores
    document.querySelectorAll("div.nota").forEach((estanota) => {
        if (estanota.id == "notamodelo" || estanota.id == nota_actual.id) { //no proceso la nota expandida ni modelo
            return
        } else {
            estanota.style.display = "none"; // oculto las demás
        }
    });
    
    nota_expandida = true; // estatus de nota expandida
    
    // Anulo eventos de arrastre en sección MAIN porque no me permiten hacer scroll en la nota.
    main.removeEventListener('pointermove', finarrastre);
    main.removeEventListener('touchmove', finarrastre);
    
    // oculto botones de biblioteca y añadir nota
    document.querySelector("img.notas_biblioteca").style.zIndex = "-2";
    document.querySelector("img.notas_nueva_nota").style.zIndex = "-2";
    
}

// modo edición
function expandir_nota_edicion(expande_nota, motivo) {
    expandir_nota(expande_nota, motivo);
    nota_modo_editar = true;
    
    let restar = altura_elementos -200 + 10; // achico, 10px de gap
    restar += "px";
    
    // Area texto editable
    let div_texto = null;
    if (motivo == "nuevanota") {
        div_texto = expande_nota.children[1];
    } else {
        div_texto = expande_nota.target.parentNode.parentNode.children[1];
    }
    
    div_texto.style.height = "calc(100% - " + restar + ")"; //restaurar después
    div_texto.style.width = "calc(93% - 15px)"; //restaurar después
    div_texto.style.overflow = "scroll";
    div_texto.contentEditable = true;   // restaurar
    
    // minimizar y ocultar botonera principal
    nota_actual.children[2].style.display = "none"; // restaurar después
    nota_actual.children[3].style.display = "none"; // restaurar después
    
    // mostrar botones de edición
    setTimeout(()=>{nota_actual.children[4].style.display = "block"}, 400);
//     setTimeout(()=>{div_texto.focus()}, 600);   // enfoco para que se abra teclado
    
    nota_original = div_texto.innerHTML; // backup para poder revertir edición
}

function minimizar_nota(target, nota_actual) {
    //reset estilos
    nota_actual.style.height = ""; // reset de altura nota
    nota_actual.children[1].style.height = ""; // reset altura div con texto
    nota_actual.children[1].scrollTop = 0; // scroll div con texto a primer linea
    nota_actual.children[1].style.overflow = ""; // reset overflow div con texto
    nota_actual.children[2].style.display = ""; // reset botonera
    nota_actual.children[3].style.display = ""; // reset botonera principal de notas
    
    masbotones(target, "minimizanota"); //contrae botonera
    
    // muestra notas ocultadas anteriormente
    document.querySelectorAll("div.nota").forEach((estanota) => {
        if (estanota.id == "notamodelo") { //no proceso la nota modelo
            return
        } else {
            estanota.style.display = ""; // reset visibilidad
        }
    });
    
    if (nota_eliminando == true) {
        nota_actual.style.backgroundColor = "var(--alerta_rojo)"; // coloreo eliminado
        nota_actual.children[1].style.color = "#ffffff"; // coloreo eliminado
        nota_eliminando == false; // restauro var
        setTimeout(()=>{nota_actual.style.opacity = "0";}, 1000) // invisible
    } else {
        nota_actual.style.backgroundColor = "var(--acento)"; // coloreo para ubicarla dácil
        nota_actual.children[1].style.color = "#ffffff"; // coloreo para ubicarla dácil
        
        // scroll to note
        setTimeout(() => {
        document.querySelector("#"+nota_actual.id).scrollIntoView({behavior: "smooth"});
        setTimeout(()=>{
            nota_actual.style.backgroundColor = ""; // quito color
            nota_actual.children[1].style.color = ""; // quito color
            }, 700);
        }, 400);
    }
    
    nota_expandida = false; // estatus de nota no expandida
    
    // restauro eventos de arrastre en sección MAIN, quitados durante la expansion de nota
    main.addEventListener('pointermove', finarrastre);
    main.addEventListener('touchmove', finarrastre);
    
    // elevo botones de biblioteca y añadir nota, despues de un tiempo para prevenir conflictos
    setTimeout(()=>{
        document.querySelector("img.notas_biblioteca").style.zIndex = "";
        document.querySelector("img.notas_nueva_nota").style.zIndex = "";
    }, 1600);
}

function confirmar_nota(target){
    //obtengo contenidod de nota
    let nota_div = target.parentNode.parentNode.children[1];
    nota_div.contentEditable = false;
    let nota_actual = target.parentNode.parentNode;
    let nro_nota_actual = nota_actual.id.slice(5,);
    
    // restauro tamaños de todo
    target.parentNode.style.display = "none";
    
    // guardo nota en libro (variable)
    let reeemplazar_orig = 1; // reemplaza nota anterior
    let string_split = notas.libros[nombre_libro_actual][nro_nota_actual]; // string nueva nota
    if (nota_esnueva == true){
        reeemplazar_orig = 0; // No reemplaza nota anterior (la agrega)
        string_split = introdiccionario + defaultdiccionario;
        nota_actual.detalle = ""; // quito status de nueva porque se va a guardar
    }
    
    string_split = separar_nota_dic(string_split);
    string_split[0] = nota_div.innerText;
    string = string_split[0] + introdiccionario + string_split[1];
    notas.libros[nombre_libro_actual].splice(nro_nota_actual, reeemplazar_orig, string); // salvo var
    nota_esnueva = false; //restauro variable
    
    //almaceno en localStorage
    window.localStorage.setItem('app_notas_libros', JSON.stringify(notas));
    
    // salgo de modo edición
    nota_modo_editar = false;
    
    // minimizar nota, restaurar todo
    minimizar_nota(target, nota_actual);
    
    nota_original = ""; //reseteo backup
    
    document.getElementsByClassName("main")[0].removeEventListener('touchmove', finarrastre); // quito evento a main (para que se pueda scrollear las notas)
}

function deshacer_edicionnota(event){
     nota_actual.children[1].innerHTML = nota_original;
}

async function borrar_nota(event, modo){
    let target = event.target;
    await dialogo_confirmacion_popup("elimina_nota", ["¿Confirmas que quieres eliminar esta nota?", "ELIMINAR", "CANCELAR"]); // abro dialogo y espero
    if (dialogo_confirmacion.result == false){return} // salgo si se canceló, no elimino nota
    
    nota_eliminando = true;
    
    if (modo == "modoedicion"){
        minimizar_nota(target, nota_actual);
    } else {
        nota_actual = target.parentNode.parentNode;
        minimizar_nota(target, nota_actual);
    }
    
    // elimino nota de variable "notas"
    let posicion = nota_actual.id.slice(5,);
    notas.libros[nombre_libro_actual].splice(posicion, 1); // elimino nota
    
    // salvo variable en cache navegador
    window.localStorage.setItem('app_notas_libros', JSON.stringify(notas));
    
    // elimino div nota, reseteo modo eliminar
    setTimeout(()=>{
        nota_actual.remove();
        nota_eliminando = false;
        reescribir_id_notas_html(); // reescribir IDs
    },1500);
}

function tachar(){
    if (nota_modo_editar == true){return} // no cambio tachado si es en modo edicion
    let target = event.target;
    if (target.style.textDecoration == ""){
        target.style.textDecoration = "line-through";
        actualiza_diccionario_de_nota(target.parentNode, "line", "yes");
    } else {
        target.style.textDecoration = "";
        actualiza_diccionario_de_nota(target.parentNode, "line", "no");
    }
}

function actualiza_diccionario_de_nota(div_nota, key, value){
    //div_nota: objeto html de nota, key: clave diccionario, value, nuevo valor clave
    
    //salvar estado
        // leer nota desde variable
    let notaid = div_nota.id.slice(5,);
    let string = notas.libros[nombre_libro_actual][notaid];
        
        // separar diccionario de string
    let string_split = separar_nota_dic(string);
    
        // actualizar diccionario a nuevo valor
    let diccionario = JSON.parse(string_split[1]);
    diccionario[key] = value;
    diccionario = JSON.stringify(diccionario);
    
        // volver a unir nota y diccionario
    let string_joined = string_split[0]+introdiccionario+diccionario;
    
        // salvar a variable
    notas.libros[nombre_libro_actual][notaid] = string_joined;
    
    
        // salvar variable a localStorage
    window.localStorage.setItem('app_notas_libros', JSON.stringify(notas));
}

function separar_nota_dic(string){
    let string_txt = string.slice(0, string.indexOf(introdiccionario));
    let string_dic = string.slice(string.indexOf(introdiccionario)+33, );
    let array = [string_txt, string_dic];
    
    return array
}



// DIALOGO CONFIRMACION
///////////////////////

async function dialogo_confirmacion_popup(motivo, opciones_array) {
    // ayuda, opciones_array [texttodeldialogo, boton1, boton2, etc]
    
    dialogo_confirmacion.result = null; // seteo a null antes que nada
    boton_presionado = ""; // seteo esto
    let libros_contenedor = document.querySelector("div.libros_contenedor");
    libros_contenedor.classList.add("oculto");
    libros_contenedor.style.display = "none";
    
    // remuevo botones viejos
    document.querySelector("div.mensajes_contenedor_botones_accion").innerHTML = ""; // positivos
    document.querySelector("div.mensajes_contenedor_para_cancel").innerHTML = ""; // negativos
    
    // loop y añado botones
    opciones_array.forEach((item, i)=>{
        if (i == 0){return} // omito primer elemento de array
        let div = document.createElement("div"); // creo div para botones
        if (item == "CANCELAR" || item == "NO" || item == "CERRAR") {
            div.innerText = item;
            div.classList.add("mensajes_no");
            div.onclick = function(){confirmacion(false)};
            document.querySelector("div.mensajes_contenedor_para_cancel").appendChild(div);
        } else { // botones que no sean para cancelar son verdes (positivos)
            div.innerText = item;
            div.classList.add("mensajes_si");
            div.onclick = function(){confirmacion(true); set_boton_presionado(this.innerText)};
            document.querySelector("div.mensajes_contenedor_botones_accion").appendChild(div);
        }
        console.log(i+": "+item);
        console.log(div);
    });
    
    // ENVIO MENSAJE hago esto
    if (motivo == "mensaje_enviar") {
        // agregar contactos
        
        // seteo botón enviar para que no responda
        document.querySelector("div.mensajes_si").style.backgroundColor = "#aaaaaa";
        textarea_validado = "requerido_false";
        
        // muestro textarea
        let textarea = document.querySelector("textarea.textarea_palabrasclave");
        textarea.value = ""; // limpio textarea
        textarea.readOnly = false;
        textarea.style.display= "inline-block"; // muestro textarea
        textarea.addEventListener("input", function(){textarea_palabrasclave_validar(textarea)} ); // agrego funcion para validar
        
        //mostrar leyenda y contactos
        //document.querySelector("div.mensajes_eligecontactoconocido").style.display = "block";
        //document.querySelector("div.contactos_contenedor").style.display = "block";
        
        dialogo_confirmacion.dialogo.childNodes[1].innerText = opciones_array[0]; // update texto dialogo
    }
    
    // RECIBO MENSAJE hago esto
    else if (motivo == "mensaje_recibir") {
        //let div = document.querySelector("div.mensajes_si");
        //div.addEventListener("click", function(){copiar_a_portapapeles("enviomensaje_palabrasclave")}); // agrego listener para recuperar palabras claves
        
        // muestro textarea
        let textarea = document.querySelector("textarea.textarea_palabrasclave");
        textarea.value = ""; // limpio textarea
        textarea.readOnly = false;
        textarea.style.display= "inline-block"; // muestro textarea
        textarea.addEventListener("input", function(){textarea_palabrasclave_recibelimpiar(textarea)} ); // agrego listener para limpiar
        
        //mostrar leyenda y contactos
        //document.querySelector("div.mensajes_eligecontactoconocido").style.display = "block";
        //document.querySelector("div.contactos_contenedor").style.display = "block";
        
        dialogo_confirmacion.dialogo.childNodes[1].innerText = opciones_array[0]; // update texto dialogo
    }
    
    // muestra dialogo de confirmacion
    else if (motivo == "notificacion_enviarmensaje"){
        //console.log("dialogo conf child 1:");
        //console.log(dialogo_confirmacion.dialogo.childNodes[1]);
        //console.log(dialogo_confirmacion.dialogo.childNodes[1].innerText);
        dialogo_confirmacion.dialogo.childNodes[1].innerText = opciones_array[0].split("*SEPARAR*")[0]; // update texto fraccionado
        let textarea = document.querySelector("textarea.textarea_palabrasclave");
        textarea.readOnly = true;
        textarea.value = opciones_array[0].split("*SEPARAR*")[1]; // limpio textarea
        textarea.style.display= "inline-block"; // muestro textarea
        
        // agrego funcionalidad de copiar al portapapeles
        let div = document.querySelector("div.mensajes_si");
        div.onclick = ""; // remuevo listeners para que no se cierre el dialogo
        div.addEventListener("click", function(){copiar_a_portapapeles("enviomensaje_palabrasclave")}); // agrego listener para copiar
    }
    
    // muestra lista de libros para enviar
    else if (motivo == "libro_enviar"){
        // cambio diálogo
        
        //alert("env libro");
        let lista = document.querySelector("div.libros_contenedor");
        let paraclonar = lista.childNodes[1].cloneNode(true);
        lista.innerHTML = "";
        
        // añado libros a la lista
        let keys = Object.keys(notas.libros);
        for (let i = 0; i < keys.length; i++){
            let nombrelibro = keys[i];
            let clone = paraclonar.cloneNode(true); // clono libro modelo
            clone.innerHTML = nombrelibro;
            clone.onclick = function(){confirmacion(true); set_boton_presionado(nombrelibro);}; // confirma acción
            //console.log(nombrelibro);
            lista.appendChild(clone);
        }
        lista.style.display = "inline-block";
        dialogo_confirmacion.dialogo.childNodes[1].innerText = opciones_array[0]; // update texto
    } 
    
    else {
        dialogo_confirmacion.dialogo.childNodes[1].innerText = opciones_array[0]; // update texto
    }
    
    dialogo_confirmacion.dialogo.style.display= "block";
    
    // LOOP hasta que se aprete algun boton
    while (dialogo_confirmacion.result == null) { 
        //console.log("esperando");
        await new Promise(res => { setTimeout(res, 500); });
    }
    
    // oculto leyenda y contactos
    document.querySelector("div.mensajes_eligecontactoconocido").style.display = "none";
    document.querySelector("div.contactos_contenedor").style.display = "none";
    // limpio y remuevo eventos de textarea
    let textarea = document.querySelector("textarea.textarea_palabrasclave");
    textarea.removeEventListener("input", function(){textarea_palabrasclave_validar(textarea)} );
    //textarea.value = "";
    textarea.style.display = "none";
    
    // restauro textarea validacion
    textarea_validado = "no_requerido";
    
    // ocultar dialogo de confirmacion
    dialogo_confirmacion.dialogo.style.display= "none";
}

function confirmacion(variable){
    if (variable == true && (textarea_validado == "no_requerido" || textarea_validado == "requerido_true") ){
        dialogo_confirmacion.result = true;
        textarea_validado = "no_requerido" // guardo default
    } else if (variable == false) {
        dialogo_confirmacion.result = false;
    }
}

function set_boton_presionado(boton){
    boton_presionado = boton;
}



// BIBLIOTECA
/////////////

function mostrar_biblioteca(){
    document.getElementById("notas_contenedor").style.display = "none"; // oculto notas    
    
    //muestra biblioteca
    let biblioteca = document.getElementById("biblioteca_contenedor");
    biblioteca.classList.remove("biblioteca_animacion_ocultar");
    biblioteca.classList.add("biblioteca_animacion_mostrar");
    //biblioteca.style.display = "inherit";
    
    setTimeout(()=>{
        biblioteca.style.display = "inherit";
        biblioteca.style.opacity= "1";
        //biblioteca.classList.remove("biblioteca_animacion_mostrar");
    }, 500);
    
    estadoapp.pantalla = "biblioteca"; // salvo var
    window.localStorage.setItem("app_notas_estado", JSON.stringify(estadoapp)); // salvo a disco
}

function habilitaeliminar(motivo) {
    if (eliminarlibros == "none" && motivo != "remover"){
        eliminarlibros = "inherit";
        event.target.style.border = "1px solid #565656";
    } else {
        eliminarlibros = "none";
        document.querySelector("img.biblioteca_eliminarlibro_boton").style.border = "";
    }
    elementos = document.querySelectorAll("span.biblioteca_eliminar");
    for (let i=0; i < elementos.length; i++) {
        if (i != 0){ //omito la primer nota (que es para añdir notas)
            setTimeout(function(){elementos[i].style.display = eliminarlibros}, 50*i);
        }
    }
}

function biblioteca_borralibrosviejos(){
    let libros_divs = document.querySelectorAll("div.biblioteca_libro");
    let cantidad = libros_divs.length;
    for (i = 0; i < cantidad; i++) {
        if (i != 0) { // omito borrar el "libro" Crear Nota
            libros_divs[i].remove();
        }
    }
}

function biblioteca_escribelibros(){
    let biblioteca_libros_contenedor = document.querySelector("div.biblioteca_libros_contenedor");
//     let biblioteca_header = document.getElementById("biblioteca_header");
    let nota_modelo = document.querySelector("div.libro_modelo"); // clono libro modelo
    let div = nota_modelo.cloneNode(true); // clono libro modelo
    let length_libros = Object.keys(notas.libros).length;
    let keys = Object.keys(notas.libros);
    
    for (i=0; i<length_libros; i++){
        let clone = div.cloneNode(true);
        let nombrelibro = keys[i];
        // preparo div
        clone.childNodes[3].src = "imagenes/biblioteca_libro.svg";
        clone.childNodes[3].onclick = function(){ir_a_nota(event.target)}; // funcion abrir nota
        clone.childNodes[5].onclick = function(){eliminar_libro(nombrelibro)}; // funcion eliminar libro
        clone.childNodes[7].onclick = function(){edita_titulo_libro(event.target)}; // funcion editar titulo
        clone.childNodes[7].innerText = nombrelibro;
        // añado div al html
        biblioteca_libros_contenedor.append(clone);
    }
}

function ir_a_nota(target, string) {
    let nombrelibro = "";
    if (target == null){
            nombrelibro = string;
    } else {
        nombrelibro = target.nextElementSibling.nextElementSibling.innerText;
    }
    
    let keys = Object.keys(notas.libros);
    let index = keys.indexOf(nombrelibro); // posicion del libro
    let libro_backup = notas.libros[nombrelibro];
    
    //pongo libro seleccionado en primer lugar (si no lo está)
    if (index > 0) {
        // elimino libro del diccionario
        delete notas.libros[nombrelibro];
        
        // Convertir el diccionario en una matriz de entradas
        let entradas = Object.entries(notas.libros);

        // Añadir libro al inicio de la matriz
        entradas.unshift([nombrelibro, libro_backup]);        

        // Convertir la matriz de nuevo en un diccionario
        notas.libros = Object.fromEntries(entradas);
        
        // Salvar a localStorage
        window.localStorage.setItem('app_notas_libros', JSON.stringify(notas));
        
        // reescribe notas nuevas
        escribeHTML_notas();
    }
    
    estadoapp.pantalla = "notas";
    window.localStorage.setItem('app_notas_estado', JSON.stringify(estadoapp)); //salvo a disco estadoapp
    
    //oculto biblioteca NO animada
    //document.getElementById("biblioteca_contenedor").style.display = "none";
    
    //oculto biblioteca biblioteca animada
    let biblioteca = document.getElementById("biblioteca_contenedor");
    biblioteca.classList.add("biblioteca_animacion_ocultar");
    //biblioteca.style.opacity= "0";
    biblioteca.style.display = "inherit";
    setTimeout(()=>{
        biblioteca.style.display = "none";
        biblioteca.classList.remove("biblioteca_animacion_ocultar"); //quito clase de animacion
    }, 500);
        
    //muestro notas
    document.getElementById("notas_contenedor").style.display = "inherit";
}

function nuevolibro() {
    habilitaeliminar("remover"); // remuevo marcas de eliminacion si están habiertas
    
    let nombrelibro = window.prompt("Un nombre para el libro: ");
    if (nombrelibro == null || nombrelibro == ""){return} // el usuario canceló la operación o no completó
    
    // creo libro en var 
    notas.libros[nombrelibro] = [];
    
    ir_a_nota(null, nombrelibro);
}

async function eliminar_libro(nombrelibro) {
    await dialogo_confirmacion_popup("elimina_libro", ["¿Confirmas que quieres eliminar este libro?", "ELIMINAR", "CANCELAR"]); // abro dialogo y espero
    if (dialogo_confirmacion.result == false){return} // salgo si se canceló, no elimino nota
    
    
    habilitaeliminar("remover"); // remuevo marcas de eliminacion si están habiertas
    
    delete notas.libros[nombrelibro]; //elimino libro
    
    biblioteca_borralibrosviejos() // borra viejos
    biblioteca_escribelibros(); // actualizo biblioteca
    
    // salvar en localStorage
    window.localStorage.setItem('app_notas_libros', JSON.stringify(notas));
}

function edita_titulo_libro(target) {
    habilitaeliminar("remover"); // remuevo marcas de eliminacion si están habiertas
    
    let nombrelibro_viejo = target.innerText;
    let textodialogo = 'Reemplaza "' + nombrelibro_viejo + '" por un nuevo nombre:';
    let nombrelibro_nuevo = window.prompt(textodialogo);
    if (nombrelibro_nuevo == null || nombrelibro_nuevo == ""){return} // el usuario canceló la operación o no completó
    
    let keys = Object.keys(notas.libros);
    let strings = Object.values(notas.libros);
    let new_dic = {};
    keys.forEach((key_item, i)=>{
        if (key_item == nombrelibro_viejo){
            key_item = nombrelibro_nuevo // reemplazo nombre viejo por nuevo
        }
        new_dic[key_item] = strings[i];
    });
    
    notas.libros = new_dic; // salvo a var
    
    // salvar en localStorage
    window.localStorage.setItem('app_notas_libros', JSON.stringify(notas));
    
    // Reemplazo nombre en HTML (biblioteca)
    target.innerText = nombrelibro_nuevo;
    // actualizo nombre de libro en funcion eliminar libro
    target.previousElementSibling.onclick = function(){eliminar_libro(nombrelibro_nuevo)};
    
    // Reemplazo nombre en HTML (pantalla notas), sólo si edité el primer libro.
    let libro_en_pantallanota = document.querySelector("span.notas_titulo");
    if (libro_en_pantallanota.innerText == nombrelibro_viejo){
        nombre_libro_actual = nombrelibro_nuevo;
        libro_en_pantallanota.innerText = nombrelibro_nuevo;
    }
    
    // coloreo para identificar nuevo nombre
    target.style.color = "var(--alerta_rojo)"; // coloreo eliminado
    setTimeout(()=>{target.style.color = "";}, 1500) // quito color
}



// MENU laterarl
////////////////


function abremenu() {
    if (menu == false){
        // muestra menu
        let menu_fondo = document.querySelector("div.menu_lateral");
        menu_fondo.classList.add("menu_fondo_aparecer");
        menu_fondo.style.display = "inherit";
        
        let menu_icono = document.querySelector(".menuapp_gear");
        menu_icono.src = "imagenes/menuapp_cerrar.svg";
        
        //animo contenido
        let menu_contenido = document.querySelector("div.menu_lateral_contenido");
        menu_contenido.classList.add("menu_aparecer");
        
        // seteo var
        menu = true;
    } else {
        //cierro menu
        
        // oculto icono
        let menu_icono = document.querySelector(".menuapp_gear");
        menu_icono.display = "none";
        
        //animo contenido
        let menu_contenido = document.querySelector("div.menu_lateral_contenido");
        menu_contenido.classList.remove("menu_aparecer"); // remuevo clase anim de entrada
        menu_contenido.classList.add("menu_desaparecer"); // anim de salida
        
        let menu_fondo = document.querySelector("div.menu_lateral");
        menu_fondo.classList.remove("menu_fondo_aparecer"); // remuevo calse anim de entrada
        menu_fondo.classList.add("menu_fondo_desaparecer"); // anim de salida
        
        // muestro icono despues de animaciones
        setTimeout(()=>{
            // restauro icono gear
            menu_icono.src = "imagenes/menuapp.svg";
            menu_icono.display = "";
            // remuevo calses de animaciones
            menu_contenido.classList.remove("menu_desaparecer");
            menu_fondo.classList.remove("menu_fondo_desaparecer");
            menu_fondo.style.display = "none";
            
        }, 500);
        
        // seteo var
        menu = false;
    }
}



// ENVIAR / RECIBIR mensajes
////////////////////////////

async function enviar_mensaje() {
    let mensaje = document.getElementById("copiame").value;
    
    await dialogo_confirmacion_popup("mensaje", ["¿Qué quieres hacer?", "⬆ ENVIAR", "⬇ RECIBIR", "CANCELAR"]); // abro dialogo y espero
    if (dialogo_confirmacion.result == false){return} // salgo si se canceló, no envío/recivo mensaje
    //alert("boton: "+boton_presionado);
    
    if (boton_presionado == "⬆ ENVIAR") {
        if (mensaje == ""){ alert("tienes que escribir algo primero"); return } // alerto y salgo si no hay mensajes
        
        //muestro dialogo
        let referencia = mensaje.substr(0, 40); // detalle de lo que se envia
        await dialogo_confirmacion_popup("mensaje_enviar", ["Vas a enviar este mensaje: '"+referencia+"...', escribe al menos 5 palabras y compártelas con quien reciba el mensaje", "ENVIAR", "CANCELAR"]); // abro dialogo y espero
        if (dialogo_confirmacion.result == false){ return } // salgo si se canceló, no envío/recivo mensaje
        
        // continúo con envio de mensaje
        envio_por_ipfs("enviar_mensaje", mensaje);
        
    } else if (boton_presionado == "⬇ RECIBIR"){
        await dialogo_confirmacion_popup("mensaje_recibir", ["Pega las palabras claves + código:", "⬇ RECIBIR", "CANCELAR"]); // abro dialogo y espero
        if (dialogo_confirmacion.result == false){return} // salgo si se canceló, no envío/recivo mensaje
        
        // continuar recibiendo
        let textarea = document.querySelector("textarea.textarea_palabrasclave");
        let palabras_clave_cid = textarea_palabrasclave_recibelimpiar(textarea);
        //console.log("palabras_clave_cid:");
        //console.log(palabras_clave_cid);
        
        let encriptado = await recepcion_por_ipfs("mensaje", palabras_clave_cid); // recibo mensaje
        
        let mensaje_desencriptado = await desencriptar(encriptado, palabras_clave_cid.slice(0,-47));
        console.log("mensaje_desencriptado:");
        console.log(mensaje_desencriptado);
        
        // MUESTRO MENSAJE en sección escrituralibre
        let escrituralibre_textarea = document.querySelector("textarea.escritura_libre_escritura");
        escrituralibre_textarea.value = mensaje_desencriptado[1];
        escrituralibre_textarea.style.backgroundColor = "var(--alerta_verde)";
        
        // TIMESTAMP proceso
        let timestamp = mensaje_desencriptado[0][0].slice(13);
        console.log(timestamp); // solo timestamp
        let time_sended= new Date(parseInt(timestamp));
        time_sended= time_sended.toLocaleString();
        let time_sended_txt = "(enviado el " + time_sended.slice(0,-3) + "hs)";
        
        // NOTIFICO bajada exitosa y timestamp
        barra_notificar("mensaje_subido", "recibido 🗸  "+time_sended_txt, 'var(--alerta_naranja)', {animacion:'mensaje_subido'}); // mostrar status publicando mensaje a ipfs
        
        await nodo.stop(); // apago nodo ipfs
        nodo = null; // restauro var
        
        // eliminos estilos
        await new Promise((resolve) => setTimeout(resolve, 3000)); // tiempo de espera
        escrituralibre_textarea.style.backgroundColor = "";
        await new Promise((resolve) => setTimeout(resolve, 8000)); // tiempo de espera
        barra_notificar("statusnormal"); // Status quitar animaciones
    }
}



// ENVIAR POR IPFS
//////////////////

async function envio_por_ipfs(motivo, mensaje){
    let palabras_clave = document.querySelector("textarea.textarea_palabrasclave").value;
        // limpiar palabras_clave (puntos, comas y espacios exteriores)
        while (/[ \./,;]/.test(palabras_clave[0])) {palabras_clave = palabras_clave.slice(1,)} // remuevo cositas al inicio
        while (/[ \./,;]/.test(palabras_clave.slice(-1))) {palabras_clave = palabras_clave.slice(0,-1)} // remuevo cositas al final
        
        
        // Inicializar nodo aquí
        await nodo_conectar();
        
        
        console.log("mensaje: "+mensaje);
        console.log("palabras clave: "+palabras_clave);
        
        
        // encriptar mensaje
        barra_notificar("encriptando", "encriptando mensaje", 'var(--alerta_naranja)', {animacion:'encriptando'}); // mostrar status encriptando
        let mensaje_crip = await encriptar(mensaje, palabras_clave);
        console.log("encriptado: "+mensaje_crip);
        console.log(mensaje_crip);
        
        // agrego mensaje encriptado a ipfs
        barra_notificar("publicando_mensaje", "subiendo el mensaje", 'var(--alerta_naranja)', {animacion:'subiendo_mensaje'}); // mostrar status publicando mensaje a ipfs
        let { cid } = await nodo.add(mensaje_crip) // devuelve variable cid
        console.log(cid.toString());
        let codigo_para_enviar = cid.toString();
        
        // DESCARGO mismo CID para ver si queda por ahí online
        let chunks = [];
        for await (const chunk of nodo.cat(codigo_para_enviar)) {
            chunks.push(chunk);
        }
        console.log("chunks: "+chunks[0].toString());
        
        
        // Obligo mensaje a pasar por GATEWAYs (quizás se expande más rápido el mensaje)
        await gateways(codigo_para_enviar);
        
        barra_notificar("mensaje_subido", "mensaje subido 🗸", 'var(--alerta_naranja)', {animacion:'mensaje_subido'}); // mostrar status publicando mensaje a ipfs
        
        // mostrar dialogo para compartir codigo CID-name + palabras
        let string = "Comparte las palabras y el código con quien recibe (en este mismo orden):" + "*SEPARAR*" + palabras_clave + " " + codigo_para_enviar// creo una string compleja para pasar datos
        await dialogo_confirmacion_popup("notificacion_enviarmensaje", [string, "COPIAR", "CERRAR"]); // abro dialogo y espero
        
        barra_notificar("statusconectado", "conectado (presione para desconectar)", 'var(--alerta_verde)', {animacion:'mensaje_subido'}); // Status a la espera
}

async function recepcion_por_ipfs(motivo, palabras_clave_cid){
        // INICIALIZO NODO IPFS
        barra_notificar("inicializando_nodo", "conectando a la red ipfs", 'var(--alerta_naranja)', {animacion:'conectando'}); // mostrar status conectando
        
        let publicKey = "";
        if (nodo === null) { // creo nodo si no está creado
            nodo = await Ipfs.create(); // creo nodo
            publicKey = (await nodo.id())['publicKey']; // obtengo llave publica //quizas esté demás esto
            console.log('Llave pública: '+publicKey);
        } else {
            publicKey = (await nodo.id())['publicKey']; // obtengo llave publica //quizas esté demás esto
            console.log('Llave pública: '+publicKey);
        }
        
        let nodo_status = nodo.isOnline() ? 'online' : 'offline';
        console.log(nodo_status);
        
        // DESCARGA mensaje
        barra_notificar("descargando_mensaje", "buscando mensaje", 'var(--alerta_naranja)', {animacion:'subiendo_mensaje'}); // mostrar status buscando mensaje mensaje
        
        let resolver = palabras_clave_cid.slice(-46);  // esto es la clave generada con el otro nodo
        console.log("resolver:");
        console.log(resolver);
        
        // chequeo swarms a ver que onda
        const addrs = await nodo.swarm.addrs();
        console.log(addrs);
        
        await new Promise((resolve) => setTimeout(resolve, 2000)); // tiempo de espera
        
        
        // Obligo mensaje a pasar por GATEWAYs (quizás se expande más rápido el mensaje)
        await gateways(resolver);
        
        const chunks = [];
        for await (let chunk of nodo.cat(resolver)) {
            chunks.push(chunk);
        }
        
        console.log("Retrieved file contents:", chunks.toString());
        console.log("encriptado:");
        console.log(chunks[0]);
        
        // DESENCRIPTAR texto
        barra_notificar("encriptando", "desencriptando mensaje", 'var(--alerta_naranja)', {animacion:'encriptando'}); //
        //let encriptado = new TextDecoder().decode(chunks[0]);
        let encriptado = new Uint8Array(chunks[0], 0); // armando un nuevo uint8array se le va el byteOffset
        console.log("nuevo encriptado:");
        console.log(encriptado);
        return encriptado;
}

// ENVIAR / RECIBIR libros
//////////////////////////

async function enviar_libro() {
    await dialogo_confirmacion_popup("mensaje", ["¿Qué quieres hacer?", "⬆ ENVIAR", "⬇ RECIBIR", "CANCELAR"]); // abro dialogo y espero
    if (dialogo_confirmacion.result == false){return} // salgo si se canceló, no envío/recivo libro
    //alert("boton: "+boton_presionado);
    
    if (boton_presionado == "⬆ ENVIAR") {
        //muestro dialogo
        await dialogo_confirmacion_popup("libro_enviar", ["Elige un libro para enviar:", "CANCELAR"]); // abro dialogo y espero
        if (dialogo_confirmacion.result == false){ 
            document.querySelector("div.libros_contenedor").style.display = "none"; // oculto lista libros
            return // salgo si se canceló, no envío/recivo mensaje
        }
        
        let libroaenviar = boton_presionado;
        
        //muestro dialogo
        let referencia = libroaenviar; // detalle de lo que se envia
        await dialogo_confirmacion_popup("mensaje_enviar", ["Vas a enviar este libro: '"+referencia+"', escribe al menos 5 palabras y compártelas con quien reciba el libro", "ENVIAR", "CANCELAR"]); // abro dialogo y espero
        if (dialogo_confirmacion.result == false){ return } // salgo si se canceló, no envío/recivo libro
        
        // continua enviando libro
        // 
        let libroeditado = notas.libros[libroaenviar].map((item)=>{return "*SEPARAR*" + item});
        libroeditado = "*SEPARAR*" + libroaenviar + libroeditado
        // subir a ipfs
        await envio_por_ipfs("enviar_libro", libroeditado);
        //alert("boton presionado:"+boton_presionado);
        console.log("Libro enviado: " + libroaenviar);
        //console.log(notas.libros[libroaenviar]);
        
        
    } else if (boton_presionado == "⬇ RECIBIR"){
        await dialogo_confirmacion_popup("mensaje_recibir", ["Pega las palabras claves + código:", "⬇ RECIBIR", "CANCELAR"]); // abro dialogo y espero
        if (dialogo_confirmacion.result == false){return} // salgo si se canceló, no envío/recivo mensaje
        
        // continuar recibiendo
        let textarea = document.querySelector("textarea.textarea_palabrasclave");
        let palabras_clave_cid = textarea_palabrasclave_recibelimpiar(textarea);
        //console.log("palabras_clave_cid:");
        //console.log(palabras_clave_cid);
        
        //recibo libro
        let encriptado = await recepcion_por_ipfs("libro", palabras_clave_cid);
        
        //desencripto libro
        let mensaje_desencriptado = await desencriptar(encriptado, palabras_clave_cid.slice(0,-47));
        console.log("mensaje_desencriptado:");
        console.log(mensaje_desencriptado[1]);
        
        let nuevolibro = mensaje_desencriptado[1].split(",*SEPARAR*"); // separo items 1ra pasada
        //console.log(nuevolibro);
        let pasada2 = nuevolibro[0].split("*SEPARAR*"); // separo en partes el primer item
        nuevolibro[0] = pasada2[2]; // guardo primer item-nota en primer lugar
        console.log(nuevolibro);
        let nuevolibro_titulo = pasada2[1];
        
        // chequeo titulo de libro
        if (notas.libros.hasOwnProperty(nuevolibro_titulo)){
            //console.log("el libro ya existe" + nuevolibro_titulo);
            nuevolibro_titulo += " I"; // modifico titulo
        }
        
        //añadir libro a variable
        notas.libros[nuevolibro_titulo] = nuevolibro;
        
        //voy al libro
        ir_a_nota(null, nuevolibro_titulo);
        
        // TIMESTAMP proceso
        let timestamp = mensaje_desencriptado[0][0].slice(13);
        console.log(timestamp); // solo timestamp
        let time_sended= new Date(parseInt(timestamp));
        time_sended= time_sended.toLocaleString();
        let time_sended_txt = "(enviado el " + time_sended.slice(0,-3) + "hs)";
        
        // NOTIFICO bajada exitosa y timestamp
        barra_notificar("mensaje_subido", "recibido 🗸  "+time_sended_txt, 'var(--alerta_naranja)', {animacion:'mensaje_subido'}); // mostrar status publicando mensaje a ipfs
        
        await nodo.stop(); // apago nodo ipfs
        nodo = null; // restauro var
        
        // eliminos estilos
        await new Promise((resolve) => setTimeout(resolve, 8000)); // tiempo de espera
        barra_notificar("statusnormal"); // Status quitar animaciones
    }
}


// BARRA NOTIFICACIONES

function barra_notificar(motivo, texto, color, dictionary){
    // obtengo barra
    let barra = document.getElementById("status");
    
    if (motivo == "statusnormal") {
        barra.className = "";
        barra.classList.add("status");
        barra.innerText = "";
        return
    }
    
    if (motivo == "statusconectado") { //statusconectado
        barra.onclick = function(){nodo_desconectar()};
    }
    
    barra.className = "";
    barra.classList.add("status");
    barra.classList.add(dictionary["animacion"]);
    barra.innerText = texto;
}


// GATEWAYS
async function gateways(cid){
        console.log("probando gateways");
        try {
            const response = await fetch(`https://cf-ipfs.com/ipfs/${cid}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/octet-stream'
            },
            responseType: 'arraybuffer',
            timeout: 3000, // Timeout in milliseconds
            });
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const file = uint8Array.buffer;
            //const file = Buffer.from(response.data);
            console.log("Recuperado de Gateway CF:");
            console.log(file.toString());
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
            console.error('The request has timed out(pasó más de 3 segundos)');
            } else {
            console.log("error:");
            console.error(error);
            }
        }
        console.log("Pasarela gateways");
}


// NODO IPFS
////////////

async function nodo_conectar(){
    // Barra de notificación
    barra_notificar("inicializando_nodo", "conectando a la red ipfs", 'var(--alerta_naranja)', {animacion:'conectando'}); // mostrar status conectando
    
    // creo nodo
    if (nodo === null) { // creo nodo si no está creado
        nodo = await Ipfs.create(); // creo nodo
        let publicKey = (await nodo.id())['publicKey']; // obtengo llave publica //quizas esté demás esto
        console.log('Llave pública: '+publicKey);
    } else {
        let publicKey = (await nodo.id())['publicKey']; // obtengo llave publica //quizas esté demás esto
        console.log('Llave pública: '+publicKey);
    }
}

async function nodo_desconectar(){
    // apago nodo ipfs
    await nodo.stop();
    nodo = null; // restauro var
    
    barra_notificar("statusnormal"); // Status quitar animaciones
}
