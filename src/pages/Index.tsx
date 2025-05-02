
import AirHockeyGame from "@/components/AirHockey/Game";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-blue-50 to-blue-100 p-4">
      <header className="w-full max-w-3xl text-center mb-6">
        <h1 className="text-4xl font-bold mb-2 text-blue-800">Аэрохоккей</h1>
        <p className="text-lg text-blue-600">Играйте прямо на экране вашего устройства!</p>
      </header>
      
      <main className="w-full max-w-3xl flex-1 flex flex-col items-center justify-center">
        <AirHockeyGame />
      </main>
      
      <footer className="w-full max-w-3xl mt-8 text-center text-sm text-blue-500">
        <p>© 2025 Аэрохоккей | Забавная игра для всех</p>
      </footer>
    </div>
  );
};

export default Index;
