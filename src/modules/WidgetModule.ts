import { NativeModules, Platform } from 'react-native';

const { WidgetModule } = NativeModules;

export const updateWidget = (text: string) => {
  if (Platform.OS === 'android') {
    WidgetModule.updateWidget(text);
  }
};
