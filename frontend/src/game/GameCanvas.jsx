import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WorldScene } from './WorldScene';

export const GameCanvas = ({ callbacks }) => {
  const container = useRef(null);
  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.CANVAS, parent: container.current, backgroundColor: '#95bf7a', pixelArt: true,
      roundPixels: true, antialias: false, scene: new WorldScene(callbacks),
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      render: { powerPreference: 'low-power', transparent: false },
      fps: { target: 60, forceSetTimeOut: false },
      input: { keyboard: { capture: [] } }, audio: { noAudio: true },
    });
    return () => game.destroy(true);
  }, [callbacks]);
  return <div ref={container} className="game-canvas" data-testid="open-world-canvas" aria-label="Kingcom interactive world map" role="application" />;
};