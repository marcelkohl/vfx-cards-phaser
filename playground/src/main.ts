import Phaser from 'phaser'
import './style.css'
import { MainScene } from './scenes/MainScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#101010',
  scene: [MainScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  render: {
    antialias: true,
  },
}

new Phaser.Game(config)
