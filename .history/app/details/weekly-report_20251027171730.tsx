// Add this to any screen where you want to access weekly reports
import { useRouter } from 'expo-router';

const SomeScreen = () => {
  const router = useRouter();
  
  return (
    <View>
      <Button 
        title="View Weekly Reports" 
        onPress={() => router.push('/details/weekly-reports')} 
      />
    </View>
  );
};