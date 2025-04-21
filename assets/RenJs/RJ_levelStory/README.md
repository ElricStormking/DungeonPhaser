# RenJS V2 Visual Novel System

This folder contains the RenJS V2 visual novel system used for storytelling between game levels.

## File Structure

- `config.json` - Main configuration file
- `characters.json` - Character definitions
- `backgrounds.json` - Background image definitions
- `level1/`, `level2/`, etc. - Level-specific story scripts
- `template_level.json` - Template for creating new level scripts

## Configuration (config.json)

The main configuration file includes:

```json
{
  "name": "Game Name",
  "startScene": "scene_name",
  "assets": {
    "characters": "characters.json",
    "backgrounds": "backgrounds.json",
    "audio": {
      "music": { "music_name": "path/to/file.mp3" },
      "sfx": { "sound_name": "path/to/file.mp3" }
    },
    "gui": {
      "textBox": "path/to/textbox.png",
      "namebox": "path/to/namebox.png"
    }
  },
  "guiConfig": {
    "textSpeed": 40,
    "autoSpeed": 150
  },
  "fonts": {
    "default": {
      "family": "Arial",
      "color": "#FFFFFF",
      "size": 20
    }
  },
  "transitions": {
    "fade": 500
  }
}
```

## Characters (characters.json)

Characters are defined as:

```json
{
  "CharacterID": {
    "displayName": "Name shown in dialogue",
    "speechColor": "#FFFFFF",
    "looks": {
      "default": {
        "image": "CharacterName.png",
        "position": "center"
      },
      "happy": {
        "image": "CharacterName_happy.png",
        "position": "center"
      }
    }
  }
}
```

## Backgrounds (backgrounds.json)

Backgrounds are defined as:

```json
{
  "BackgroundID": {
    "image": "BackgroundName.png"
  }
}
```

## Story Scripts

Story scripts use the following actions:

### Setting Backgrounds
```json
{
  "setBackground": {
    "name": "BackgroundID",
    "transitionName": "fade",
    "transitionDuration": 500
  }
}
```

### Playing Music
```json
{
  "playMusic": {
    "name": "music_name",
    "loop": true,
    "volume": 1.0
  }
}
```

### Showing Characters
```json
{
  "showCharacter": {
    "name": "CharacterID",
    "look": "default",
    "position": "left",
    "transitionName": "fadeIn",
    "transitionDuration": 300
  }
}
```

### Dialogue
```json
{
  "say": {
    "character": "CharacterID",
    "text": "Dialogue text goes here."
  }
}
```

### Narration
```json
{
  "narrate": "Narration text goes here."
}
```

### Choices
```json
{
  "choice": {
    "text": "What would you like to do?",
    "options": [
      {
        "text": "Option 1",
        "action": "jumpToLabel",
        "label": "option1"
      },
      {
        "text": "Option 2",
        "action": "jumpToLabel",
        "label": "option2"
      }
    ]
  }
}
```

### Control Flow
```json
{
  "label": "labelName"
}
```

```json
{
  "jumpToLabel": {
    "label": "labelName"
  }
}
```

### Ending a Story
```json
{
  "endGame": {}
}
```

## Creating a New Level Story

1. Create a new folder for the level (e.g., `level33/`)
2. Copy `template_level.json` to your new folder and rename it to `yaju_script.json`
3. Modify the script to create your story
4. Update the scene name in the JSON to match your level

## Notes

- Character positions: "left", "center", "right"
- Transitions: "fade", "slideLeft", "slideRight", "slideUp", "slideDown"
- Use simple filenames for images (e.g., "CharacterName.png", not full paths)
- The engine will automatically look for character images in the characters folder and backgrounds in the backgrounds folder
- Scene names should be unique for each level 