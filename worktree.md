# Implementacion de Powerup

vamos a crear nuevas funcionalidades, para ello pondremos nuestro agente de ia en modo planeacion, para luego implementar la nueva funcionalidad.


## PowerApp Velocidad ( prompt )

```
Agregaremos un nuevo feature o. power-up a nuestro juego que se va a llamar "Velocidad", el cual va a permiritle al personaje moverse el doble de rapido durante cinco segundos
```

## PowerApp Estrella fujas ( prompt )

```
Implementar un asteroide especial "estrella fugaz", que se mueve más rapido de lo normal pero desaprarece con el tiempo.
```


## Powerup Hyperspace

```
agrega otro power up "Hyperspace", esto hace que la nave sale a otro lugar del tablero de manera aleatoria solo podra hacer esto 3 veces por turno
```


## Worktrees

1. Crear directorio `.worktrees/`
```
mkdir .worktrees
```

2. Ejecutar:
```
git worktree add .worktrees/<nombre-del-worktree>
```

## Creacion de los worktree por Features:

### Feature 1

  Crear Worktree

  ```
    git worktree add .worktrees/03-shot
  ```

  Abrir el worktree en una ventana de nuestro agente de ia

  Prompt PowerApp 1
  ```
implementemos un **triple shot**: Por 5 segundos, el personaje dispara 3 veces en línea recta.
  ```

### Feature 2

 Crear Worktree

  ```
    git worktree add .worktrees/04-skins
  ```
  Abrir el worktree en una ventana de nuestro agente de ia

  Prompt PowerApp 2
  ```
  implementemos un **sistema de skins**: Poder cambiar la apariencia de la nave.
  ```

### Feature 3

 Crear Worktree

  ```
    git worktree add .worktrees/05-shield
  ```

  Abrir el worktree en una ventana de nuestro agente de ia


  Prompt PowerApp 3
  ```
  implementemos un **Shield**: Un escudo que protege a la nave de los asteroides por 5 segundos
  ```


## Listar los worktrees

Comando para listar lo worktree.

```
git worktree list
```

# Abrir cada unos de los worktree

  Abrir cada uno de los  worktree en una ventana de nuestro agente de ia


### Feature 1


  Prompt PowerApp 1
  ```
Implementemos un **triple shot**: Por 5 segundos, el personaje dispara 3 veces en línea recta.
  ```

### Feature 2

  Prompt PowerApp 2

   ```
  Implementemos un **sistema de skins**: Poder cambiar la apariencia de la nave.
  ```

### Feature 3 - Shield

  Prompt PowerApp 3

  ```
  implementemos un **Shield**: Un escudo que protege a la nave de los asteroides por 5 segundos
  ```





## Hacer merge de los worktrees

una vez terminado los trabajos de cada unos de los agentes sera necesario realizar el merge de cada unos de los codigos de los worktree.


Prompt merge worktree

```
  necesito que unas en esta rama los worktrees   
  03-shot
  02-skins
  05-shield
  una vez terminado no boores los wirdtrees. yo voy a hacer eso manual
```


## Eliminar los worktrees

  git worktrees remove <worktree_folder>

```
git worktree remove .worktrees/03-shot 
git worktree remove .worktrees/04-skins 
git worktree remove .worktrees/05-shield 
```

  

## Eliminar ramas

  git branch -d <rama_local>

```
git branch -d 03-shot 
git branch -d 04-skins 
git branch -d 05-shield 
```




# Creacion Comando Worktree

con este comando automatizamos la generacion de un comando, en este caso es para la creacion de un worktree.

crea un comando en la carpeta que tiene por defecto tu agente de IA, para el caso de claude la carpeta es 

```
.claude/commands
```

la siguiente seccion copia y pega el texto en un archivo llamadao worktree.md en la ruta especifica.

```

## /worktree - Create a clean Git Worktree

Use this command to create and initialize a new git worktree for parallel development.

## Usage
/worktree <branch-name> [base-branch]

## Context
- The user wants to create a new worktree.
- The arguments provided are: $ARGUMENTS
- Target branch/folder name: $1
- Base branch (optional): $2

## Instructions
1. Validate that the user provided at least one argument ($1) representing the branch/folder name. If not, ask for it.
2. Determine the path for the new worktree. It should be located one level above the current repository root, inside a folder named after the project and branch (e.g., `../${CURRENT_REPO_NAME}-worktrees/$1`).
3. Check if the target branch ($1) already exists in Git:
   - If it exists, checkout that branch in the new worktree.
   - If it does not exist, create it using the base branch ($2) or the default main/master branch if $2 is not provided.
4. Execute the terminal command to create the worktree:
   `git worktree add <computed-path> -b $1` (or without `-b` if the branch already exists).
5. Once created, inform the user of the absolute path to the new worktree and offer to list active worktrees using `git worktree list`.

```