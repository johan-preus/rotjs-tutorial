const Game = {
    display: null,
    // note this is unrelated to map method
    map: {},
    player: null,
    engine: null,
    ananas: null,

    init() {
        //this initializes the console (html <canvas>)
        //default size 80x25, config with ROT.DEFAULT_WIDTH / DEFAULT_HEIGHT
        this.display = new ROT.Display()
        document.body.appendChild(this.display.getContainer())

        this._generateMap()

        // handles turn order
        const scheduler = new ROT.Scheduler.Simple()
        scheduler.add(this.player, true)
        scheduler.add(this.pedro, true)
        this.engine = new ROT.Engine(scheduler)
        this.engine.start()
    },

    _generateMap() {
        const digger = new ROT.Map.Digger()
        const freeCells = []

        const digCallback = function (x, y, value) {
            if (value) return //not storing walls

            const key = `${x},${y}`
            freeCells.push(key)
            this.map[key] = "."
        }
        digger.create(digCallback.bind(this))

        this._generateBoxes(freeCells)

        this._drawWholeMap()

        // this._createPlayer(freeCells)
        this.player = this._createBeing(Player, freeCells)
        this.pedro = this._createBeing(Pedro, freeCells)
    },

    _drawWholeMap() {
        for (let key in this.map) {
            const parts = key.split(",")
            const x = parseInt(parts[0])
            const y = parseInt(parts[1])
            this.display.draw(x, y, this.map[key])
        }
    },

    _generateBoxes(freeCells) {
        for (let i = 0; i < 10; i++) {
            const random = ROT.RNG.getUniform() //rot's way of Math.random()
            const randIndex = Math.floor(random * freeCells.length)
            const key = freeCells.splice(randIndex, 1)[0]
            this.map[key] = "*"

            //puts anana in first box
            if (!i) this.ananas = key
        }
    },

    // _createPlayer(freeCells) {
    //     const randIndex = Math.floor(ROT.RNG.getUniform() * freeCells.length)
    //     const key = freeCells.splice(randIndex, 1)[0]
    //     let [x, y] = key.split(",")
    //     this.player = new Player(parseInt(x), parseInt(y))
    // },

    _createBeing(whatClass, freeCells) {
        const randIndex = Math.floor(ROT.RNG.getUniform() * freeCells.length)
        const key = freeCells.splice(randIndex, 1)[0]
        const [x, y] = key.split(",")
        return new whatClass(parseInt(x), parseInt(y))
    },
}

class Player {
    constructor(x, y) {
        this._x = x
        this._y = y
        this._draw()
    }

    _draw() {
        Game.display.draw(this._x, this._y, "@", "#ff0")
    }

    //an actor in rotjs is an object with an act method, otherwise error
    act() {
        // wait for user input on players turn
        Game.engine.lock()
        window.addEventListener("keydown", this)
    }

    _checkBox() {
        const key = `${this._x},${this._y}`
        if (Game.map[key] !== "*") alert("There is no box here!")
        else if (key === Game.ananas) {
            alert("Hooray! You found an ananas, you win!")
            Game.engine.lock()
            window.removeEventListener("keydown", this)
        } else alert("The box is empty.")
    }

    //called on event
    handleEvent(event) {
        const keyMap = {}
        keyMap[38] = 0
        keyMap[33] = 1
        keyMap[39] = 2
        keyMap[34] = 3
        keyMap[40] = 4
        keyMap[35] = 5
        keyMap[37] = 6
        keyMap[36] = 7

        const code = event.keyCode
        if (code === 13 || code === 32) {
            this._checkBox()
            return
        }
        if (!(code in keyMap)) return

        const diff = ROT.DIRS[8][keyMap[code]]
        const newX = this._x + diff[0]
        const newY = this._y + diff[1]

        const newKey = `${newX},${newY}`
        // if cant move in this direction return
        if (!(newKey in Game.map)) return

        Game.display.draw(this._x, this._y, Game.map[`${this._x},${this._y}`])
        this._x = newX
        this._y = newY
        this._draw()
        window.removeEventListener("keydown", this)
        // resume game engine when turn is done
        Game.engine.unlock()
    }

    getX() {
        return this._x
    }

    getY() {
        return this._y
    }
}

class Pedro {
    constructor(x, y) {
        this._x = x
        this._y = y
        this._draw()
    }

    _draw() {
        Game.display.draw(this._x, this._y, "P", "red")
    }

    act() {
        const playerX = Game.player.getX()
        const playerY = Game.player.getY()
        function passableCallback(x, y) {
            return `${x},${y}` in Game.map
        }

        const aStar = new ROT.Path.AStar(playerX, playerY, passableCallback, {
            topology: 4,
        })

        // stores shortest path between pedro and player
        const path = []

        function pathCallback(x, y) {
            path.push([x, y])
        }
        aStar.compute(this._x, this._y, pathCallback)

        // removes pedro's position
        path.shift()
        if (path.length === 1) {
            Game.engine.lock()
            alert("Game Over - captured by Pedro")
        } else {
            const x = path[0][0]
            const y = path[0][1]
            Game.display.draw(
                this._x,
                this._y,
                Game.map[`${this._x},${this._y}`]
            )
            this._x = x
            this._y = y
            this._draw()
        }
    }
}
