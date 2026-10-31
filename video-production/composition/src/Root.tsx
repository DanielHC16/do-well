import {Composition} from 'remotion';
import {Film} from './Film';
import data from './data.json';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="DoWellFilm" component={Film} durationInFrames={Math.round(data.duration*30)} fps={30} width={1920} height={1080}/>
    </>
  );
};
