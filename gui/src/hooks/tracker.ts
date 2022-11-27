import { useEffect, useMemo, useRef, useState } from 'react';
import { BodyPart, TrackerDataT, TrackerStatus } from 'solarxr-protocol';
import { bodypartToString } from '../components/utils/formatting';
import { makeReferenceAdjustedRotation, QuaternionFromQuatT, QuaternionToEulerDegrees } from '../maths/quaternion';
import { useAppContext } from './app';

export function useTrackers() {
  const { trackers } = useAppContext();

  return {
    trackers,
    useAssignedTrackers: () =>
      useMemo(
        () =>
          trackers.filter(
            ({ tracker }) => tracker.info?.bodyPart !== BodyPart.NONE
          ),
        [trackers]
      ),
    useUnassignedTrackers: () =>
      useMemo(
        () =>
          trackers.filter(
            ({ tracker }) => tracker.info?.bodyPart === BodyPart.NONE
          ),
        [trackers]
      ),
    useConnectedTrackers: () =>
      useMemo(
        () =>
          trackers.filter(
            ({ tracker }) => tracker.status !== TrackerStatus.DISCONNECTED
          ),
        [trackers]
      ),
  };
}

export function useTracker(tracker: TrackerDataT) {
  const referenceAdjustedRotation = (opts?: { withoutMountingPos?: boolean }) => {
    const isAssignedIMUTracker = tracker.rotation &&
      tracker.info?.mountingOrientation &&
      tracker.info?.refAdjGyroFix &&
      tracker.info?.refAdjAttachmentFix &&
      tracker.info?.refAdjYawFix;
    if (!isAssignedIMUTracker) return QuaternionFromQuatT(tracker?.rotation);
    
    const quatRotation = QuaternionFromQuatT(tracker.rotation);
    const quatMounting = QuaternionFromQuatT(tracker.info?.mountingOrientation);
    if (opts?.withoutMountingPos) {
      return makeReferenceAdjustedRotation(
        quatRotation.clone().multiply(quatMounting),
        QuaternionFromQuatT(tracker.info?.refAdjGyroFix)
          .invert()
          .multiply(quatMounting.clone().invert())
          .invert(),
        QuaternionFromQuatT(tracker.info?.refAdjAttachmentFix)
          .multiply(quatMounting.clone().invert()),
        QuaternionFromQuatT(tracker.info?.refAdjYawFix),
      );
    }

    return makeReferenceAdjustedRotation(
      quatRotation.clone().multiply(quatMounting),
      QuaternionFromQuatT(tracker.info?.refAdjGyroFix),
      QuaternionFromQuatT(tracker.info?.refAdjAttachmentFix),
      QuaternionFromQuatT(tracker.info?.refAdjYawFix),
    );
  }

  return {
    useName: () =>
      useMemo(() => {
        if (tracker.info?.customName) return tracker.info?.customName;
        if (tracker.info?.bodyPart) return bodypartToString(tracker.info?.bodyPart);
        return tracker.info?.displayName || 'NONE';
      }, [tracker.info]),
    useRotation: () =>
      useMemo(
        () => QuaternionToEulerDegrees(tracker?.rotation),
        [tracker.rotation]
      ),
    useReferenceAdjustedRotation: () => 
      useMemo(
        () => QuaternionToEulerDegrees(referenceAdjustedRotation()),
        [tracker.rotation]
      ),
    useReferenceAdjustedRotationQuat: () => 
      useMemo(
        () => referenceAdjustedRotation(),
        [tracker.rotation]
      ),
    useReferenceAdjustedRotationNoMountingQuat: () => 
      useMemo(
        () => referenceAdjustedRotation({ withoutMountingPos: true }),
        [tracker.rotation]
      ),
    useVelocity: () => {
      const previousRot = useRef<{
        x: number;
        y: number;
        z: number;
        w: number;
      }>(tracker.rotation || { x: 0, y: 0, z: 0, w: 1 });
      const [velocity, setVelocity] = useState<number>(0);
      const [rots, setRotation] = useState<number[]>([]);

      useEffect(() => {
        if (tracker.rotation) {
          const rot = QuaternionFromQuatT(tracker.rotation).multiply(
            QuaternionFromQuatT(previousRot.current).invert()
          );
          const dif = Math.min(1, (rot.x ** 2 + rot.y ** 2 + rot.z ** 2) * 2.5);
          // Use sum of rotation of last 3 frames (0.3sec) for smoother movement and better detection of slow movement.
          if (rots.length === 3) {
            rots.shift();
          }
          rots.push(dif);
          setRotation(rots);
          setVelocity(
            Math.min(
              1,
              Math.max(
                0,
                rots.reduce((a, b) => a + b)
              )
            )
          );
          previousRot.current = tracker.rotation;
        }
      }, [tracker.rotation]);

      return velocity;
    },
  };
}

export function useTrackerFromId(
  trackerNum: string | number | undefined,
  deviceId: string | number | undefined
) {
  const { trackers } = useAppContext();

  const tracker = useMemo(
    () =>
      trackers.find(
        ({ tracker }) =>
          trackerNum &&
          deviceId &&
          tracker?.trackerId?.trackerNum == trackerNum &&
          tracker?.trackerId?.deviceId?.id == deviceId
      ),
    [trackers, trackerNum, deviceId]
  );

  return tracker;
}
