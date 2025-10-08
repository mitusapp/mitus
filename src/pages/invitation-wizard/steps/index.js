// src/pages/invitation-wizard/steps/index.js
import {
  PartyPopper,
  User as UserIcon,
  MessageSquare,
  Calendar,
  MapPin,
  List,
  Image as ImageIcon,
  LayoutTemplate,
} from 'lucide-react';

import StepEventType from './StepEventType';
import StepHostsEvent from './StepHostsEvent';
import StepInitialMessage from './StepInitialMessage';
import StepInvitationMessage from './StepInvitationMessage';
import StepDateTime from './StepDateTime';
import StepLocations from './StepLocations';
import StepIndications from './StepIndications';
import StepCoverImage from './StepCoverImage';
import StepTemplate from './StepTemplate';

export const steps = [
  { id: 1, title: 'Tipo de Evento', icon: PartyPopper, Component: StepEventType },
  { id: 2, title: 'Anfitriones y Evento', icon: UserIcon, Component: StepHostsEvent },
  { id: 3, title: 'Mensaje Inicial', icon: MessageSquare, Component: StepInitialMessage },
  { id: 4, title: 'Mensaje de Invitación', icon: MessageSquare, Component: StepInvitationMessage },
  { id: 5, title: 'Fecha y Hora', icon: Calendar, Component: StepDateTime },
  { id: 6, title: 'Ubicaciones', icon: MapPin, Component: StepLocations },
  { id: 7, title: 'Indicaciones', icon: List, Component: StepIndications },
  { id: 8, title: 'Imagen del Evento', icon: ImageIcon, Component: StepCoverImage },
  { id: 9, title: 'Plantilla', icon: LayoutTemplate, Component: StepTemplate },
];
