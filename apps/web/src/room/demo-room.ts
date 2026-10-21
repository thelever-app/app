import type { SimulatedRoomOptions } from './simulated-room-connection.ts';

/**
 * The room the web opens in development: you are Ana, three fake players answer at different
 * paces, and six dilemmas written for the demo. No option is presented as the right one.
 */
export const DEMO_ROOM: SimulatedRoomOptions = {
  nickname: 'Ana',
  language: 'es',
  others: [
    { nickname: 'Luis', answerEveryMs: 3000 },
    { nickname: 'Marta', answerEveryMs: 5000 },
    { nickname: 'Pablo', answerEveryMs: 8000 },
  ],
  dilemmas: [
    {
      text: 'Un tranvía sin frenos va hacia cinco personas que trabajan en la vía. Puedes desviarlo a otra vía, donde hay una sola persona. ¿Qué haces?',
      options: ['Desviar el tranvía', 'No tocar nada'],
    },
    {
      text: 'Encuentras una cartera con 200 € y el carné de su dueño, que vive a una hora de tu casa. ¿Qué haces?',
      options: [
        'Llevársela en persona',
        'Dejarla en una comisaría',
        'Quedarte el dinero y enviarle el carné',
      ],
    },
    {
      text: 'Tu mejor amigo te pide que digas que esta noche estuvo contigo. No es verdad. ¿Lo cubres?',
      options: ['Sí, lo cubro', 'No, no miento por él'],
    },
    {
      text: 'En un hospital queda un único respirador libre y lo necesitan cuatro pacientes a la vez. ¿A quién se lo das?',
      options: [
        'A la niña de 8 años',
        'Al médico de 45 años',
        'A la atleta de 30 años',
        'Al hombre de 80 años',
      ],
    },
    {
      text: 'Ves a un compañero copiando en el mismo examen de certificación que estás haciendo tú. ¿Qué haces?',
      options: ['Avisar a quien vigila', 'Hablar con él después', 'No hacer nada'],
    },
    {
      text: 'Puedes saber con total certeza la fecha de tu muerte. ¿Quieres saberla?',
      options: ['Sí, quiero saberla', 'No, prefiero no saberla'],
    },
  ],
};
