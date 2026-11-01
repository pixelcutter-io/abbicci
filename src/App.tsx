import { Navigate, Route, Routes } from 'react-router';
import Home from '@/pages/Home';
import Why from '@/pages/Why';

const App = () => {
  return (
    <Routes>
      <Route path={'/'} element={<Home />} />
      <Route path={'/why'} element={<Why />} />
      <Route path={'*'} element={<Navigate to={'/'} replace={true} />} />
    </Routes>
  );
};

export default App;
