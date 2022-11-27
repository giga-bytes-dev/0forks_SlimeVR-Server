import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useConfig } from '../../hooks/config';
import { useWebsocketAPI } from '../../hooks/websocket-api';
import { CheckBox } from '../commons/Checkbox';
import { Typography } from '../commons/Typography';

export interface DeveloperModeWidgetForm {
  highContrast: boolean,
  preciseRotation: boolean,
  fastDataFeed: boolean,
  filterSlimesAndHMD: boolean,
  sortByName: boolean,
  rawSlimeRotation: boolean,
  moreInfo: boolean,
}

export function DeveloperModeWidget() {
  const { config, setConfig } = useConfig();
  const { reconnect } = useWebsocketAPI();

  const { reset, control, handleSubmit, watch } = useForm<DeveloperModeWidgetForm>({
    defaultValues: {
      highContrast: false,
      preciseRotation: false,
      fastDataFeed: false,
      filterSlimesAndHMD: false,
      sortByName: false,
      rawSlimeRotation: false,
      moreInfo: false,
    },
  });

  useEffect(() => {
    reset(config?.devSettings || {});
  }, []);

  useEffect(() => {
    const subscription = watch(() => handleSubmit(onSubmit)());
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (formData: DeveloperModeWidgetForm) => {
    const needReconnect = config?.devSettings?.fastDataFeed !== formData.fastDataFeed;
    await setConfig({ devSettings: formData });
    if (needReconnect) reconnect();
  };

  const makeToggle = ([name, label]: string[], index: number) => (
    <CheckBox
      key={index}
      control={control}
      variant="toggle"
      name={name}
      label={label}
    ></CheckBox>
  );

  const toggles = {
    highContrast: 'High contrast',
    preciseRotation: 'Precise rotation',
    fastDataFeed: 'Fast data feed',
    filterSlimesAndHMD: 'Filter slimes and HMD',
    sortByName: 'Sort by name',
    rawSlimeRotation: 'Raw rotation',
    moreInfo: 'More info',
  };

  return (
    <form className="bg-background-60 flex flex-col w-full rounded-md px-2">
      <div className="mt-2 px-1">
        <Typography color="secondary">Developer mode</Typography>
      </div>
      { Object.entries(toggles).map(makeToggle) }
    </form>
  );
}
