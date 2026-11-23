import { CONTACT_EMAIL } from '../contact-email.ts';

/**
 * The answer to a request by email that proves nobody's: without the code, nor from the email of
 * a notice, it is not carried out (RES-48), and the answer says how to send it again.
 */
export const NOT_CARRIED_OUT_REPLY = `Hola:

No podemos atender tu petición porque no viene con el código que nos dice que los datos son tuyos.

Abre TheLever en el móvil o el ordenador con el que juegas, entra en Ajustes › Privacidad y datos › Tus datos, copia tu código y envíanos de nuevo la petición a ${CONTACT_EMAIL} con él. Si solo enviaste una denuncia desde la web, escríbenos desde el email que dejaste en ella.

Un saludo,
TheLever

---

Hello,

We cannot carry out your request because it does not come with the code that tells us the data are yours.

Open TheLever on the phone or computer you play on, go to Settings › Privacy and data › Your data, copy your code and send us the request again at ${CONTACT_EMAIL} with it. If you only sent a notice from the web, write to us from the email you left in it.

Best,
TheLever`;
