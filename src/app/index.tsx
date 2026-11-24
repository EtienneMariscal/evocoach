import { StyleSheet, Text, View } from 'react-native';

// Pantalla provisional de M0. Se sustituye en T2.8 (navegacion por rol);
// los textos pasan a i18n en T2.3.
export default function Index() {
  return (
    <View style={styles.container}>
      {/* eslint-disable-next-line i18next/no-literal-string -- placeholder hasta T2.3 */}
      <Text>evocoach</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
