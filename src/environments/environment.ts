/**
 * Configuración de Firebase (Firestore) para guardar los personajes creados.
 *
 * Pasos: consola de Firebase → crear proyecto → Firestore Database (modo prueba o con las
 * reglas de `firestore.rules`) → Configuración del proyecto → «Tus apps» → Web, y copiar
 * aquí el objeto `firebaseConfig`. Estos valores son públicos por diseño: la protección
 * de los datos la dan las reglas de Firestore, no esta clave.
 */
export const environment = {
  firebase: {
    apiKey: 'AIzaSyDOEFK0XoNKG-sD_tpxG0VQhi_TcHcXzA8',
    authDomain: 'creador-personajes.firebaseapp.com',
    projectId: 'creador-personajes',
    storageBucket: 'creador-personajes.firebasestorage.app',
    messagingSenderId: '651608703861',
    appId: '1:651608703861:web:8df21bf4eecd3b6e22493c',
    measurementId: 'G-TFVBMQ6DS4',
  },
  /** Colección de Firestore donde se guardan los personajes. */
  coleccion: 'personajes',
};
