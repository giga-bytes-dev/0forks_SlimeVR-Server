import classNames from 'classnames';
import { MouseEventHandler, ReactChild, useMemo, useState } from 'react';
import {
  TrackerDataT,
  TrackerIdT,
  TrackerStatus as TrackerStatusEnum,
} from 'solarxr-protocol';
import { FlatDeviceTracker } from '../../hooks/app';
import { useTracker } from '../../hooks/tracker';
import { FootIcon } from '../commons/icon/FootIcon';
import { Typography } from '../commons/Typography';
import { TrackerBattery } from './TrackerBattery';
import { TrackerStatus } from './TrackerStatus';
import { TrackerWifi } from './TrackerWifi';
import { IPv4 } from 'ip-num/IPNumber';
import { useConfig } from '../../hooks/config';
import { formatVector3 } from '../utils/formatting';

const isSlime = ({ device }: FlatDeviceTracker) =>
  device?.hardwareInfo?.manufacturer === 'SlimeVR';

const getDeviceName = ({ device }: FlatDeviceTracker) =>
  device?.customName?.toString() || '';

const getTrackerName = ({ tracker }: FlatDeviceTracker) =>
  tracker?.info?.customName?.toString() || '';

export function TrackerNameCol({ tracker }: { tracker: TrackerDataT }) {
  const { useName } = useTracker(tracker);

  const name = useName();

  return (
    <div className="flex flex-row gap-2">
      <div className="flex flex-col justify-center items-center fill-background-10">
        <FootIcon></FootIcon>
      </div>
      <div className="flex flex-col flex-grow whitespace-nowrap">
        <Typography bold>{name}</Typography>
        <TrackerStatus status={tracker.status}></TrackerStatus>
      </div>
    </div>
  );
}

export function TrackerRotCol(
  { tracker, precise, color, referenceAdjusted }:
  { tracker: TrackerDataT, precise?: boolean, color?: string, referenceAdjusted?: boolean }
) {
  const { useRotation, useReferenceAdjustedRotation } = useTracker(tracker);

  const rot = referenceAdjusted ? useReferenceAdjustedRotation() : useRotation();

  return (
    <Typography color={color}>
      <span className="whitespace-nowrap">
        {formatVector3(rot, precise ? 2 : 0)}
      </span>
    </Typography>
  );
}

export function RowContainer({
  children,
  rounded = 'none',
  hover,
  tracker,
  onClick,
  onMouseOver,
  onMouseOut,
}: {
  children: ReactChild;
  rounded?: 'left' | 'right' | 'none';
  hover: boolean;
  tracker: TrackerDataT;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onMouseOver?: MouseEventHandler<HTMLDivElement>;
  onMouseOut?: MouseEventHandler<HTMLDivElement>;
}) {
  const { useVelocity } = useTracker(tracker);

  const velocity = useVelocity();

  return (
    <div
      className={classNames(
        'py-1',
        rounded === 'left' && 'pl-3',
        rounded === 'right' && 'pr-3',
        'overflow-hidden'
      )}
    >
      <div
        onClick={onClick}
        onMouseEnter={onMouseOver}
        onMouseLeave={onMouseOut}
        style={{
          boxShadow: `0px 0px ${velocity * 8}px ${velocity * 8}px #183951`,
        }}
        className={classNames(
          'min-h-[50px]  flex flex-col justify-center px-3',
          rounded === 'left' && 'rounded-l-lg',
          rounded === 'right' && 'rounded-r-lg',
          hover ? 'bg-background-50 cursor-pointer' : 'bg-background-60'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function TrackersTable({
  flatTrackers,
  clickedTracker,
}: {
  clickedTracker: (tracker: TrackerDataT) => void;
  flatTrackers: FlatDeviceTracker[];
}) {
  const { config } = useConfig();
  const [ hoverTracker, setHoverTracker ] = useState<TrackerIdT | null>(null);

  const trackerEqual = (id: TrackerIdT | null) =>
    id?.trackerNum == hoverTracker?.trackerNum &&
    (!id?.deviceId || id.deviceId.id == hoverTracker?.deviceId?.id);

  const filteringEnabled = config?.debug && config?.devSettings?.filterSlimesAndHMD;
  const sortingEnabled = config?.debug && config?.devSettings?.sortByName;
  // TODO: fix memo
  const filteredSortedTrackers = useMemo(() => {
      const list = filteringEnabled ?
        flatTrackers.filter(t => getDeviceName(t) === 'HMD' || isSlime(t)) :
        flatTrackers;

      if (sortingEnabled) {
        list.sort((a, b) => getTrackerName(a).localeCompare(getTrackerName(b)));
      }

      return list;
    },
    [flatTrackers, filteringEnabled, sortingEnabled]
  );

  const makeColumnContainerProps = (tracker: TrackerDataT, index: number) => ({
    key: index,
    tracker,
    onClick: () => clickedTracker(tracker),
    hover: trackerEqual(tracker.trackerId),
    onMouseOver: () => setHoverTracker(tracker.trackerId),
    onMouseOut: () => setHoverTracker(null),
  });

  const fontColor = config?.devSettings?.highContrast ? 'primary' : 'secondary';
  const moreInfo = config?.devSettings?.moreInfo;

  return (
    <div className="flex w-full overflow-x-auto py-2">
      <div className="flex flex-col gap-1">
        <div className="flex px-3">Tracker</div>
        {filteredSortedTrackers.map(({ tracker }, index) => (
          <RowContainer rounded="left" {...makeColumnContainerProps(tracker, index)}>
            <TrackerNameCol tracker={tracker}></TrackerNameCol>
          </RowContainer>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex px-3">Type</div>
        {filteredSortedTrackers.map(({ device, tracker }, index) => (
          <RowContainer {...makeColumnContainerProps(tracker, index)}>
            <Typography color={fontColor}>
              {device?.hardwareInfo?.manufacturer || '--'}
            </Typography>
          </RowContainer>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex px-3">Battery</div>
        {filteredSortedTrackers.map(({ device, tracker }, index) => (
          <RowContainer {...makeColumnContainerProps(tracker, index)}>
            {(device &&
              device.hardwareStatus &&
              device.hardwareStatus.batteryPctEstimate && (
                <TrackerBattery
                  value={device.hardwareStatus?.batteryPctEstimate / 100}
                  voltage={device.hardwareStatus?.batteryVoltage}
                  disabled={tracker.status === TrackerStatusEnum.DISCONNECTED}
                  textColor={fontColor}
                />
              )) || <></>}
          </RowContainer>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex px-3 whitespace-nowrap">Ping / RSSI</div>
        {filteredSortedTrackers.map(({ device, tracker }, index) => (
          <RowContainer {...makeColumnContainerProps(tracker, index)}>
            {(device &&
              device.hardwareStatus &&
              device.hardwareStatus.rssi &&
              device.hardwareStatus.ping && (
                <TrackerWifi
                  rssi={device.hardwareStatus.rssi}
                  ping={device.hardwareStatus.ping}
                  rssiShowNumeric={true}
                  disabled={tracker.status === TrackerStatusEnum.DISCONNECTED}
                  textColor={fontColor}
                ></TrackerWifi>
              )) || <></>}
          </RowContainer>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex px-3">TPS</div>
        {filteredSortedTrackers.map(({ device, tracker }, index) => (
          <RowContainer {...makeColumnContainerProps(tracker, index)}>
            <Typography color={fontColor}>
              {device?.hardwareStatus?.tps != null ? device?.hardwareStatus?.tps : <></>}
            </Typography>
          </RowContainer>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className={classNames('flex px-3 whitespace-nowrap', {
          'w-44': config?.devSettings?.preciseRotation,
          'w-32': !config?.devSettings?.preciseRotation,
        })}>Rotation X/Y/Z</div>
        {filteredSortedTrackers.map(({ tracker }, index) => (
          <RowContainer {...makeColumnContainerProps(tracker, index)}>
            <TrackerRotCol color={fontColor}
              tracker={tracker}
              precise={config?.devSettings?.preciseRotation}
              referenceAdjusted={!config?.devSettings?.rawSlimeRotation}
            />
          </RowContainer>
        ))}
      </div>
      <div className="flex flex-col gap-1 flex-grow">
        <div className="flex px-3 whitespace-nowrap">Temp. °C</div>
        {filteredSortedTrackers.map(({ tracker }, index) => (
          <RowContainer
            rounded={moreInfo ? 'none' : 'right'}
            {...makeColumnContainerProps(tracker, index)}
          >
            {(tracker.temp && (
              <Typography color={fontColor}>
                <span className="whitespace-nowrap">
                  {`${tracker.temp?.temp.toFixed(2)}`}
                </span>
              </Typography>
            )) || <></>}
          </RowContainer>
        ))}
      </div>
      { moreInfo && <div className="flex flex-col gap-1">
        <div className="flex px-3 whitespace-nowrap w-32">Accel. X/Y/Z</div>
        {filteredSortedTrackers.map(({ tracker }, index) => (
          <RowContainer {...makeColumnContainerProps(tracker, index)}>
            {(tracker.linearAcceleration && (
              <Typography color={fontColor}>
                <span className="whitespace-nowrap">
                  {formatVector3(tracker.linearAcceleration, 1)}
                </span>
              </Typography>
            )) || <></>}
          </RowContainer>
        ))}
      </div> }
      { moreInfo && <div className="flex flex-col gap-1">
        <div className="flex px-3 whitespace-nowrap w-32">Position X/Y/Z</div>
        {filteredSortedTrackers.map(({ tracker }, index) => (
          <RowContainer {...makeColumnContainerProps(tracker, index)}>
            {(tracker.position && (
              <Typography color={fontColor}>
                <span className="whitespace-nowrap">
                  {formatVector3(tracker.position)}
                </span>
              </Typography>
            )) || <></>}
          </RowContainer>
        ))}
      </div> }
      { moreInfo && <div className="flex flex-col gap-1 flex-grow">
        <div className="flex px-3">URL</div>
        {filteredSortedTrackers.map(({ device, tracker }, index) => (
          <RowContainer rounded="right" {...makeColumnContainerProps(tracker, index)}>
            <Typography color={fontColor}>
              udp://
              {IPv4.fromNumber(
                device?.hardwareInfo?.ipAddress?.addr || 0
              ).toString()}
            </Typography>
          </RowContainer>
        ))}
      </div> }
    </div>
  );
}
