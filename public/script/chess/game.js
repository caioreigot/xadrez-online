import initializeMessageBox from './message-box.js'
import addChoosePawnTransformationListener from './listeners/choose-pawn-transformation.js';
import addDocumentMouseListeners from './listeners/document-mouse-listeners.js';
import addSquareMouseListeners from './listeners/square-mouse-listener.js';
import { MessageType, getMessage } from './utils/messages.js';
import { PieceColor, PieceType, Pawn, Rook, Horse, Bishop, Queen, King } from './pieceClasses.js';
import { BoardCoord } from './utils/boardCoord.js';

export default class Game {

    constructor(
        state = {
            boardMap: new Map(),
            roomId: null,
            playerColor: null,
            isMyTurn: false,
            isKingInCheck: false
        },
        observers = [],
        messageBox = null,
        firstSelection = true,
        selectedPiece = null,
        selectedPiecePosition = null,
        pieceObj = null,
        pawnToTransform = null,
        possibleMoves = {},
        checkIndicative = []
    ) {
        this.state = state;
        this.observers = observers;
        this.messageBox = messageBox;
        this.firstSelection = firstSelection;
        this.selectedPiece = selectedPiece;
        this.selectedPiecePosition = selectedPiecePosition;
        this.pieceObj = pieceObj;
        this.pawnToTransform = pawnToTransform;
        this.possibleMoves = possibleMoves;
        this.checkIndicative = checkIndicative;
    }

    subscribe(observerFunction) {
        this.observers.push(observerFunction);
    }

    notifyAll(command) {
        for (const observerFunction of this.observers) {
            observerFunction(command);
        }
    }

    paintPossibleMoves(possibleMovesArg) {
        possibleMovesArg.walkPositions.forEach(position => {
            let currentSquare = document.querySelector(`#square${position}`);
            
            /* Adiciona filtro verde e borda ao quadrado */
            currentSquare.style.filter = "grayscale(100%) brightness(80%) sepia(300%) hue-rotate(50deg) saturate(500%) drop-shadow(0 0 0.75rem green)";
            currentSquare.style.border = "1px #000706 solid";
        });
    
        possibleMovesArg.attackPositions.forEach(position => {
            let currentSquare = document.querySelector(`#square${position}`);
            
            /* Adiciona filtro vermelho e borda ao quadrado */
            currentSquare.style.filter = "grayscale(100%) brightness(40%) sepia(100%) hue-rotate(-50deg) saturate(600%) contrast(0.8)";
            currentSquare.style.border = "1px #000706 solid";
        });
    }

    unpaintPossibleMoves() {
        this.possibleMoves.walkPositions.forEach(position => {
            this.clearFilterAndBorder(
                document.querySelector(`#square${position}`)
            );
        });
    
        this.possibleMoves.attackPositions.forEach(position => {
            this.clearFilterAndBorder(
                document.querySelector(`#square${position}`)
            );
        });
    }

    paintCheckIndicatives(checkIndicative) {
        this.checkIndicative = checkIndicative;
        /* Pinta todas as posi????es que estiverem em "checkIndicative"
        para vermelho, indicando um xeque no rei */
        checkIndicative.forEach(position => {
            let currentSquare = document.querySelector(`#square${position}`);
            
            /*Adicionar filtro vermelho e borda ao quadrado*/
            currentSquare.style.filter = "grayscale(100%) brightness(40%) sepia(100%) hue-rotate(-50deg) saturate(600%) contrast(0.8)";
            currentSquare.style.border = "1px #000706 solid";
        });
    }

    unpaintCheckIndicatives() {
        this.checkIndicative.forEach(position => {
            this.clearFilterAndBorder(
                document.querySelector(`#square${position}`)
            );
        });
    }

    clearFilterAndBorder(element) {
        element.style.filter = "";
        element.style.border = "";
    }

    setSelectedPiece(node) {
        this.selectedPiece = node;
        this.firstSelection = true;
    
        if (!this.selectedPiece) return;
    
        this.selectedPiecePosition = parseInt(
            this.selectedPiece.parentNode.id.replace("square", "")
        );
    }
    
    setPossibleMoves(moves) {
        this.possibleMoves = moves;
    }

    /* Fun????o chamada quando uma pe??a ?? selecionada sem o jogador
    estar com outra pe??a selecionada */
    firstSelectionCall(square) {
        this.setSelectedPiece(square.firstChild);

        /* De acordo com a posi????o da pe??a selecionada, pegar a 
        inst??ncia dela no Map "boardMap" */
        this.pieceObj = this.state.boardMap.get(this.selectedPiecePosition);

        /* Pega um array com as posi????es que essa pe??a pode andar
        Obs: n??o leva em conta obst??culos no caminho */
        this.possibleMoves = this.pieceObj.getPossibleMoves(this.selectedPiecePosition);

        /* Pinta os quadrados em que a pe??a pode se mover */
        this.paintPossibleMoves(this.possibleMoves);
    }

    /* Fun????o chamada quando o player clica em um novo quadrado estando
    com uma pe??a selecionada */
    secondSelectionCall(event, target, invokedByDragAndDrop = false) {
        let positionClicked;
        
        /* Pega a posi????o selecionada (de maneiras diferentes caso a sele????o
        tenha sido a div do quadrado ou a img da pe??a) */
        target.classList.contains("chess-piece") 
            ? positionClicked = parseInt(target.parentNode.id.replace("square", ""))
            : positionClicked = parseInt(target.id.replace("square", ""));
        
        /* Verificando uma poss??vel tentativa de roque
        Se a pe??a selecionada ?? o rei
        e se o filho do target existir
        e se este filho cont??m as classes rook e this.state.playerColor */
        if (this.pieceObj.constructor.name.toLowerCase() == PieceType.King
            && target.firstChild
            && (target.firstChild.classList.contains(PieceType.Rook) 
                && target.firstChild.classList.contains(this.state.playerColor))
        ) {
            const rookObj = this.state.boardMap.get(positionClicked);
            const kingObj = this.pieceObj;

            /* S?? continuar se nem o rei e nem a torre foram movidos ainda */
            if (kingObj.alreadyMoved || rookObj.alreadyMoved) return;

            /* Se a torre estiver na esquerda do rei 
            e o caminho at?? esta torre estiver livre */
            if (rookObj.position < kingObj.position
                && this.state.boardMap.get(60) == null
                && this.state.boardMap.get(59) == null
                && this.state.boardMap.get(58) == null
            ) {
                let mirroredPlay;

                /* Mover o rei pro quadrado 59 */

                kingObj.moveTo(59);

                mirroredPlay = BoardCoord.mirrorPlay(
                    BoardCoord.toCoord(61), 
                    BoardCoord.toCoord(59)
                );

                this.notifyAll({
                    type: 'pieceMoved',
                    thisBoardMap: this.state.boardMap,
                    mirroredOldPosition: mirroredPlay.oldPosition,
                    mirroredNewPosition: mirroredPlay.newPosition
                });

                /* Mover a torre pro quadrado 60 */

                rookObj.moveTo(60);

                mirroredPlay = BoardCoord.mirrorPlay(
                    BoardCoord.toCoord(57), 
                    BoardCoord.toCoord(60)
                );

                this.notifyAll({
                    type: 'pieceMoved',
                    thisBoardMap: this.state.boardMap,
                    mirroredOldPosition: mirroredPlay.oldPosition,
                    mirroredNewPosition: mirroredPlay.newPosition
                });
            /* Se a torre estiver na direita do rei 
            e o caminho at?? esta torre estiver livre */
            } else if (rookObj.position > kingObj.position
                && this.state.boardMap.get(62) == null
                && this.state.boardMap.get(63) == null
            ) {
                let mirroredPlay;

                /* Mover o rei pro quadrado 63 */

                kingObj.moveTo(63);

                mirroredPlay = BoardCoord.mirrorPlay(
                    BoardCoord.toCoord(61), 
                    BoardCoord.toCoord(63)
                );

                this.notifyAll({
                    type: 'pieceMoved',
                    thisBoardMap: this.state.boardMap,
                    mirroredOldPosition: mirroredPlay.oldPosition,
                    mirroredNewPosition: mirroredPlay.newPosition
                });

                /* Mover a torre pro quadrado 62 */

                rookObj.moveTo(62);

                mirroredPlay = BoardCoord.mirrorPlay(
                    BoardCoord.toCoord(64), 
                    BoardCoord.toCoord(62)
                );

                this.notifyAll({
                    type: 'pieceMoved',
                    thisBoardMap: this.state.boardMap,
                    mirroredOldPosition: mirroredPlay.oldPosition,
                    mirroredNewPosition: mirroredPlay.newPosition
                });
            }
        }

        /* Booleana que diz se pelo menos um dos arrays n??o est?? vazio */
        let arrayNotEmpty = this.possibleMoves.walkPositions.length > 0 
            ||this.possibleMoves.attackPositions.length > 0;
        
        /* Booleana que diz se a posi????o clicada est?? entre os movimentos poss??veis */
        let legalMoveSelected = this.possibleMoves.walkPositions.includes(positionClicked) 
            || this.possibleMoves.attackPositions.includes(positionClicked);
        
        /* Se h?? jogadas dispon??veis e ele pode andar para aquela posi????o */
        if (arrayNotEmpty && legalMoveSelected) {
            const mirroredPlay = BoardCoord.mirrorPlay(
                BoardCoord.toCoord(this.pieceObj.position), 
                BoardCoord.toCoord(positionClicked)
            );
            
            /* Movendo a pe??a para o lugar clicado */
            this.pieceObj.moveTo(positionClicked);

            /* Se for um pe??o e ele tiver chego no fim do tabuleiro 
            deixar o jogador escolher a transforma????o */
            if (this.pieceObj.constructor.name.toLowerCase() == PieceType.Pawn) {
                let newPosToCoord = BoardCoord.toCoord(positionClicked);
                
                if (newPosToCoord.y == 1) {
                    this.pawnToTransform = this.pieceObj;

                    const choosePawnTransformation = document
                        .querySelector('#choose-pawn-transformation');

                    [...choosePawnTransformation.children].forEach(img => {
                        img.classList.add(this.state.playerColor);
                    });
                    
                    choosePawnTransformation.style.display = 'block';
                    choosePawnTransformation.style.left = event.clientX + "px";
                    choosePawnTransformation.style.top = event.clientY + "px";
                }
            }

            const command = {
                type: 'pieceMoved',
                thisBoardMap: this.state.boardMap,
                mirroredOldPosition: mirroredPlay.oldPosition,
                mirroredNewPosition: mirroredPlay.newPosition
            }

            this.notifyAll(command);
        }

        /* Se essa fun????o n??o foi invocada ap??s um drag and drop
        e se o quadrado conter um filho sendo da cor do player
        e se n??o houver pe??a selecionada
        Marcar uma nova sele????o */
        if (!invokedByDragAndDrop
            && target.firstChild
            && target.firstChild.classList.contains(this.state.playerColor)
            && this.selectedPiece === null
        ) {
            this.firstSelectionCall(target);
        } else {
            this.setSelectedPiece(null)
            this.unpaintPossibleMoves();
        }
    }

    /* Preenche o Map que cont??m os conjuntos de chave e valor que representam
    o tabuleiro, contendo [posi????o, objeto], onde a posi????o ?? o id de um quadrado
    do tabuleiro e o objeto ?? uma classe ChessPiece ou null */
    fillBoardMap() {

        let colorOnBottom;
        let colorOnTop;

        if (this.state.playerColor === PieceColor.White) {
            colorOnBottom = PieceColor.White;
            colorOnTop = PieceColor.Dark;
        } else {
            colorOnBottom = PieceColor.Dark;
            colorOnTop = PieceColor.White;
        }

        for (let i = 1; i <= 64; i++) {
            /* Obs: A primeira posi????o no tabuleiro renderizado no front-end
            se refere ao primeiro quadrado do topo superior esquerdo e vai
            aumentando para direita */
            switch (i) {
                /* Pe??as que ficam na parte superior do tabuleiro 
                em rela????o ?? vis??o do jogador */
                case 1:
                case 8:
                    this.state.boardMap.set(
                        i, new Rook(this, colorOnTop, i));
                    break;
                case 2:
                case 7:
                    this.state.boardMap.set(
                        i, new Horse(this, colorOnTop, i));
                    break;
                case 3:
                case 6:
                    this.state.boardMap.set(
                        i, new Bishop(this, colorOnTop, i));
                    break;
                case 4:
                    this.state.boardMap.set(
                        i, new Queen(this, colorOnTop, i));
                    break;
                case 5:
                    this.state.boardMap.set(
                        i, new King(this, colorOnTop, i));
                    break;

                /* Pe??as que ficam na parte inferior do tabuleiro 
                em rela????o ?? vis??o do jogador */
                case 57:
                case 64:
                    this.state.boardMap.set(
                        i, new Rook(this, colorOnBottom, i));
                    break;
                case 58:
                case 63:
                    this.state.boardMap.set(
                        i, new Horse(this, colorOnBottom, i));
                    break;
                case 59:
                case 62:
                    this.state.boardMap.set(
                        i, new Bishop(this, colorOnBottom, i));
                    break;
                case 60:
                    this.state.boardMap.set(
                        i, new Queen(this, colorOnBottom, i));
                    break;
                case 61:
                    this.state.boardMap.set(
                        i, new King(this, colorOnBottom, i));
                    break;
                default:
                    this.state.boardMap.set(i, null);
                    break;
            }

            /* Adicionando a fileira de pe??es da parte superior */
            if (i >= 9 && i <= 16) {
                this.state.boardMap.set(
                    i, new Pawn(this, colorOnTop, i, true));
            /* Adicionando a fileira de pe??es da parte inferior */
            } else if (i >= 49 && i <= 56) {
                this.state.boardMap.set(
                    i, new Pawn(this, colorOnBottom, i, true));
            }
        }
    }

    clearPieces() {
        for (let i = 1; i <= 64; i++) {
            const firstChild = document.querySelector(`#square${i}`).firstChild;
            
            if (firstChild)
                firstChild.remove();
        }
    }

    renderPieces() {
        this.clearPieces();

        for (let i = 1; i <= 64; i++) {
            const pieceObj = this.state.boardMap.get(i);
            
            if (pieceObj == null) continue;

            const square = document.querySelector(`#square${i}`);
            const pieceImg = document.createElement("img");
            const classesToAdd = ["chess-piece"];
            
            classesToAdd.push(
                pieceObj.pieceColor,
                pieceObj.constructor.name.toLowerCase()
            );
            
            classesToAdd.forEach(e => { pieceImg.classList.add(e); });
            
            /* Adicionando a imagem da pe??a como filha da div 
            que representa o quadrado */
            square.appendChild(pieceImg);
        }
    }

    receiveOpponentPlay(oldPosition, newPosition) {
        const pieceObj = this.state.boardMap.get(oldPosition);
        if (pieceObj == null) return;
        
        pieceObj.moveTo(newPosition, true);
        this.verifyCheck(newPosition);

        this.renderPieces();
    }

    verifyCheck(piecePosition) {
        const pieceObj = this.state.boardMap.get(piecePosition);

        /* Verifica se o pe??o inimigo deu xeque no rei */
        if (pieceObj.constructor.name.toLowerCase() == PieceType.Pawn) {
            let pawnPositionCoord = BoardCoord.toCoord(pieceObj.position);
            let kingPositionCoord;

            /* Loop pelo boardMap procurando o rei da cor aliada */
            for (let [positionKey, pieceValue] of this.state.boardMap.entries()) {
                if (pieceValue != null 
                    && pieceValue.constructor.name.toLowerCase() == PieceType.King
                    && pieceValue.pieceColor == this.state.playerColor
                ) {
                    kingPositionCoord = BoardCoord.toCoord(positionKey);
                }
            }

            /* Se o pe??o estiver exatamente na linha de cima do rei */
            const isPawnAboveKing = pawnPositionCoord.y == kingPositionCoord.y - 1;

            /* Se o pe??o estiver na diagonal esquerda ou direita do rei */
            const isPawnIsInDiagonal = (pawnPositionCoord.x == kingPositionCoord.x - 1
                || pawnPositionCoord.x == kingPositionCoord.x + 1)

            if (isPawnAboveKing && isPawnIsInDiagonal) {
                this.isKingInCheck = true;
                this.paintCheckIndicatives([piecePosition, kingPositionCoord.toNumber()]);
                
                const message = getMessage(MessageType.InCheck);
                this.messageBox.show(message);
            }

            return;
        }

        /* Verifica se o oponente deu um xeque no rei 
        (essa verifica????o serve pra todas as pe??as com excess??o
        do pe??o, que foi feita acima)*/
        pieceObj
            .getPossibleMoves(piecePosition)
            .attackPositions.forEach(e => {
                let piece = this.state.boardMap.get(e);
                if (piece.constructor.name.toLowerCase() != PieceType.King) return;

                this.isKingInCheck = true;
                this.paintCheckIndicatives([piecePosition, e]);
                
                const message = getMessage(MessageType.InCheck);
                this.messageBox.show(message);
            });
    }
    
    endGame(winningColor) {
        if (winningColor == PieceColor.White)
            this.messageBox.show(
                getMessage(MessageType.Winner, 'brancas'));
        else
            this.messageBox.show(
                getMessage(MessageType.Winner, 'pretas'));

        this.messageBox.clearPiecesOnClose(this);

        const command = {
            type: 'gameEnded',
            roomId: this.state.roomId
        }

        this.notifyAll(command);
    }

    addListeners() {
        addChoosePawnTransformationListener(this);
        addSquareMouseListeners(this);
        addDocumentMouseListeners(this);
    }

    setTurn(isMyTurn) {
        const boardDiv = document.querySelector('#board');

        this.state.isMyTurn = isMyTurn;
                
        isMyTurn 
            ? boardDiv.classList.add('your-turn') 
            : boardDiv.classList.remove('your-turn')
    }
    
    /* Configura????es iniciais */
    start(board, playerColor, roomId) {
        this.board = board;
        this.state.playerColor = playerColor;
        this.state.roomId = roomId;

        /* Se o jogador for o das pe??as brancas, ele come??a jogando */
        if (playerColor == PieceColor.White)
            this.setTurn(true);

        /* Preenche o boardMap (configura????o inicial) */
        this.fillBoardMap();

        /* Renderizando as pe??as pela primeira vez */
        this.renderPieces();

        /* Cria a regra de movimenta????o das pe??as */
        this.addListeners();

        /* Inicializa o message box para uso */
        this.messageBox = initializeMessageBox();
    }
}