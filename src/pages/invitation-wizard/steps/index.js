// src/pages/invitation-wizard/steps/index.js
// Flujo optimizado del asistente: se ocultan/eliminan pasos de mensajes, ubicaciones,
// indicaciones y plantilla. Solo quedan los pasos necesarios.

import StepEventType from './StepEventType';
import StepHostsEvent from './StepHostsEvent';
import StepDateTime from './StepDateTime';
import StepCoverImage from './StepCoverImage';

// Orden de pasos en el wizard
const steps = [
  {
    id: 'event-type',
    title: 'Tipo de evento',
    component: StepEventType,
  },
  {
    id: 'hosts',
    title: 'Anfitriones',
    component: StepHostsEvent,
  },
  {
    id: 'datetime',
    title: 'Fecha, hora, país y moneda',
    component: StepDateTime,
  },
  {
    id: 'cover',
    title: 'Imagen de portada',
    component: StepCoverImage,
  },
];

export default steps;
export { steps };
