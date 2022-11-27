import { BodyPart } from "solarxr-protocol";

export const bodypartToString = (id: BodyPart) =>
  BodyPart[id].replace(/_/g, ' ');

export const formatVector3 = ({ x, y, z }: { x: number, y: number, z: number }, precision = 0) =>
  `${x.toFixed(precision)} / ${y.toFixed(precision)} / ${z.toFixed(precision)}`;
