class ChessGame {
    constructor() {
        // Game state properties
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.gameOver = false;
        this.gameStatus = 'active';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        
        // Castling rights for both players
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        
        // En passant target square (if applicable)
        this.enPassantTarget = null;
        
        // Track king positions for check detection
        this.kingPositions = { white: 'e1', black: 'e8' };
        
        // Fifty-move rule counter
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        
        // Selected square and valid moves
        this.selectedSquare = null;
        this.validMoves = [];
        
        // Initialize the game
        this.initializeGame();
    }

    /**
     * Initialize the chess board with starting positions
     * @returns {Object} Initial board state
     */
    initializeBoard() {
        const board = {};
        
        // Initialize empty board
        for (let file of 'abcdefgh') {
            for (let rank = 1; rank <= 8; rank++) {
                board[file + rank] = null;
            }
        }
        
        // Place white pieces
        board['a1'] = { type: 'rook', color: 'white' };
        board['b1'] = { type: 'knight', color: 'white' };
        board['c1'] = { type: 'bishop', color: 'white' };
        board['d1'] = { type: 'queen', color: 'white' };
        board['e1'] = { type: 'king', color: 'white' };
        board['f1'] = { type: 'bishop', color: 'white' };
        board['g1'] = { type: 'knight', color: 'white' };
        board['h1'] = { type: 'rook', color: 'white' };
        
        // Place white pawns
        for (let file of 'abcdefgh') {
            board[file + '2'] = { type: 'pawn', color: 'white' };
        }
        
        // Place black pieces
        board['a8'] = { type: 'rook', color: 'black' };
        board['b8'] = { type: 'knight', color: 'black' };
        board['c8'] = { type: 'bishop', color: 'black' };
        board['d8'] = { type: 'queen', color: 'black' };
        board['e8'] = { type: 'king', color: 'black' };
        board['f8'] = { type: 'bishop', color: 'black' };
        board['g8'] = { type: 'knight', color: 'black' };
        board['h8'] = { type: 'rook', color: 'black' };
        
        // Place black pawns
        for (let file of 'abcdefgh') {
            board[file + '7'] = { type: 'pawn', color: 'black' };
        }
        
        return board;
    }

    /**
     * Initialize the game interface
     */
    initializeGame() {
        this.createBoard();
        this.updateDisplay();
        this.setupEventListeners();
    }

    /**
     * Create the visual chess board
     */
    createBoard() {
        const boardElement = document.getElementById('chessBoard');
        boardElement.innerHTML = '';
        
        // Create 64 squares
        for (let rank = 8; rank >= 1; rank--) {
            for (let file of 'abcdefgh') {
                const square = document.createElement('div');
                const squareId = file + rank;
                
                square.id = squareId;
                square.className = `square ${(file.charCodeAt(0) + rank) % 2 === 0 ? 'dark' : 'light'}`;
                square.dataset.square = squareId;
                
                // Add piece if it exists
                const piece = this.board[squareId];
                if (piece) {
                    square.appendChild(this.createPieceElement(piece));
                }
                
                boardElement.appendChild(square);
            }
        }
    }

    /**
     * Create a piece element with appropriate Unicode symbol
     * @param {Object} piece - Piece object with type and color
     * @returns {HTMLElement} Piece element
     */
    createPieceElement(piece) {
        const pieceElement = document.createElement('div');
        pieceElement.className = `piece ${piece.color}`;
        pieceElement.draggable = true;
        
        // Unicode chess symbols
        const symbols = {
            white: {
                king: '♔', queen: '♕', rook: '♖',
                bishop: '♗', knight: '♘', pawn: '♙'
            },
            black: {
                king: '♚', queen: '♛', rook: '♜',
                bishop: '♝', knight: '♞', pawn: '♟'
            }
        };
        
        pieceElement.textContent = symbols[piece.color][piece.type];
        return pieceElement;
    }

    /**
     * Set up event listeners for the game
     */
    setupEventListeners() {
        const boardElement = document.getElementById('chessBoard');
        
        // Board click events
        boardElement.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (square) {
                this.handleSquareClick(square.dataset.square);
            }
        });

        // Drag and drop events
        boardElement.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('piece')) {
                const square = e.target.closest('.square');
                if (square) {
                    this.handleDragStart(square.dataset.square);
                }
            }
        });

        boardElement.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        boardElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const square = e.target.closest('.square');
            if (square) {
                this.handleDrop(square.dataset.square);
            }
        });

        // Control buttons
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.newGame();
        });

        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undoLastMove();
        });

        document.getElementById('closeMessage').addEventListener('click', () => {
            this.hideMessage();
        });
    }

    /**
     * Handle square click events
     * @param {string} squareId - The clicked square identifier
     */
    handleSquareClick(squareId) {
        if (this.gameOver) return;

        const piece = this.board[squareId];
        
        // If no square is selected
        if (!this.selectedSquare) {
            if (piece && piece.color === this.currentPlayer) {
                this.selectSquare(squareId);
            }
        } else {
            // If clicking the same square, deselect
            if (this.selectedSquare === squareId) {
                this.deselectSquare();
            } 
            // If clicking a piece of the same color, select that piece
            else if (piece && piece.color === this.currentPlayer) {
                this.selectSquare(squareId);
            }
            // Otherwise, try to make a move
            else {
                this.attemptMove(this.selectedSquare, squareId);
            }
        }
    }

    /**
     * Handle drag start
     * @param {string} squareId - The square being dragged from
     */
    handleDragStart(squareId) {
        if (this.gameOver) return;
        
        const piece = this.board[squareId];
        if (piece && piece.color === this.currentPlayer) {
            this.selectSquare(squareId);
        }
    }

    /**
     * Handle drop event
     * @param {string} squareId - The square being dropped on
     */
    handleDrop(squareId) {
        if (this.selectedSquare && this.selectedSquare !== squareId) {
            this.attemptMove(this.selectedSquare, squareId);
        }
    }

    /**
     * Select a square and show valid moves
     * @param {string} squareId - The square to select
     */
    selectSquare(squareId) {
        this.deselectSquare(); // Clear previous selection
        
        this.selectedSquare = squareId;
        this.validMoves = this.getValidMovesForPiece(squareId);
        
        // Update visual indicators
        document.getElementById(squareId).classList.add('selected');
        
        this.validMoves.forEach(move => {
            const targetSquare = document.getElementById(move.to);
            if (move.capture) {
                targetSquare.classList.add('valid-capture');
            } else {
                targetSquare.classList.add('valid-move');
            }
        });
    }

    /**
     * Deselect the current square
     */
    deselectSquare() {
        if (this.selectedSquare) {
            document.getElementById(this.selectedSquare).classList.remove('selected');
        }
        
        // Clear all move indicators
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('valid-move', 'valid-capture', 'selected');
        });
        
        this.selectedSquare = null;
        this.validMoves = [];
    }

    /**
     * Attempt to make a move
     * @param {string} from - Source square
     * @param {string} to - Target square
     */
    attemptMove(from, to) {
        const validMove = this.validMoves.find(move => move.to === to);
        
        if (validMove) {
            this.makeMove(validMove);
            this.deselectSquare();
        } else {
            // Invalid move - show feedback
            this.showMessage('Invalid move! Please try again.');
            this.deselectSquare();
        }
    }

    /**
     * Get all valid moves for a piece on a given square
     * @param {string} squareId - The square containing the piece
     * @returns {Array} Array of valid move objects
     */
    getValidMovesForPiece(squareId) {
        const piece = this.board[squareId];
        if (!piece || piece.color !== this.currentPlayer) {
            return [];
        }

        let moves = [];
        
        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(squareId);
                break;
            case 'rook':
                moves = this.getRookMoves(squareId);
                break;
            case 'bishop':
                moves = this.getBishopMoves(squareId);
                break;
            case 'knight':
                moves = this.getKnightMoves(squareId);
                break;
            case 'queen':
                moves = this.getQueenMoves(squareId);
                break;
            case 'king':
                moves = this.getKingMoves(squareId);
                break;
        }

        // Filter moves that would leave the king in check
        return moves.filter(move => !this.wouldLeaveKingInCheck(move));
    }

    /**
     * Get valid pawn moves
     * @param {string} squareId - Square containing the pawn
     * @returns {Array} Array of valid moves
     */
    getPawnMoves(squareId) {
        const piece = this.board[squareId];
        const moves = [];
        const file = squareId[0];
        const rank = parseInt(squareId[1]);
        
        const direction = piece.color === 'white' ? 1 : -1;
        const startRank = piece.color === 'white' ? 2 : 7;
        const promotionRank = piece.color === 'white' ? 8 : 1;

        // Forward moves
        const oneForward = file + (rank + direction);
        if (this.isValidSquare(oneForward) && !this.board[oneForward]) {
            if (rank + direction === promotionRank) {
                // Pawn promotion
                ['queen', 'rook', 'bishop', 'knight'].forEach(promoteTo => {
                    moves.push({
                        from: squareId,
                        to: oneForward,
                        piece: piece.type,
                        promotion: promoteTo,
                        capture: false
                    });
                });
            } else {
                moves.push({
                    from: squareId,
                    to: oneForward,
                    piece: piece.type,
                    capture: false
                });
            }

            // Two squares forward from starting position
            if (rank === startRank) {
                const twoForward = file + (rank + 2 * direction);
                if (this.isValidSquare(twoForward) && !this.board[twoForward]) {
                    moves.push({
                        from: squareId,
                        to: twoForward,
                        piece: piece.type,
                        capture: false
                    });
                }
            }
        }

        // Capture moves
        const captureFiles = [
            String.fromCharCode(file.charCodeAt(0) - 1),
            String.fromCharCode(file.charCodeAt(0) + 1)
        ];

        captureFiles.forEach(captureFile => {
            if (captureFile >= 'a' && captureFile <= 'h') {
                const captureSquare = captureFile + (rank + direction);
                
                if (this.isValidSquare(captureSquare)) {
                    const targetPiece = this.board[captureSquare];
                    
                    // Regular capture
                    if (targetPiece && targetPiece.color !== piece.color) {
                        if (rank + direction === promotionRank) {
                            // Capture with promotion
                            ['queen', 'rook', 'bishop', 'knight'].forEach(promoteTo => {
                                moves.push({
                                    from: squareId,
                                    to: captureSquare,
                                    piece: piece.type,
                                    promotion: promoteTo,
                                    capture: true,
                                    capturedPiece: targetPiece.type
                                });
                            });
                        } else {
                            moves.push({
                                from: squareId,
                                to: captureSquare,
                                piece: piece.type,
                                capture: true,
                                capturedPiece: targetPiece.type
                            });
                        }
                    }
                    
                    // En passant capture
                    if (this.enPassantTarget === captureSquare) {
                        moves.push({
                            from: squareId,
                            to: captureSquare,
                            piece: piece.type,
                            capture: true,
                            enPassant: true,
                            capturedPiece: 'pawn'
                        });
                    }
                }
            }
        });

        return moves;
    }

    /**
     * Get valid rook moves
     * @param {string} squareId - Square containing the rook
     * @returns {Array} Array of valid moves
     */
    getRookMoves(squareId) {
        const piece = this.board[squareId];
        const moves = [];
        const directions = [
            [0, 1], [0, -1], [1, 0], [-1, 0] // up, down, right, left
        ];

        directions.forEach(([fileDir, rankDir]) => {
            moves.push(...this.getMovesInDirection(squareId, fileDir, rankDir, piece.color));
        });

        return moves;
    }

    /**
     * Get valid bishop moves
     * @param {string} squareId - Square containing the bishop
     * @returns {Array} Array of valid moves
     */
    getBishopMoves(squareId) {
        const piece = this.board[squareId];
        const moves = [];
        const directions = [
            [1, 1], [1, -1], [-1, 1], [-1, -1] // diagonals
        ];

        directions.forEach(([fileDir, rankDir]) => {
            moves.push(...this.getMovesInDirection(squareId, fileDir, rankDir, piece.color));
        });

        return moves;
    }

    /**
     * Get valid knight moves
     * @param {string} squareId - Square containing the knight
     * @returns {Array} Array of valid moves
     */
    getKnightMoves(squareId) {
        const piece = this.board[squareId];
        const moves = [];
        const file = squareId[0];
        const rank = parseInt(squareId[1]);
        
        const knightMoves = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];

        knightMoves.forEach(([fileOffset, rankOffset]) => {
            const newFile = String.fromCharCode(file.charCodeAt(0) + fileOffset);
            const newRank = rank + rankOffset;
            const targetSquare = newFile + newRank;

            if (this.isValidSquare(targetSquare)) {
                const targetPiece = this.board[targetSquare];
                
                if (!targetPiece) {
                    moves.push({
                        from: squareId,
                        to: targetSquare,
                        piece: piece.type,
                        capture: false
                    });
                } else if (targetPiece.color !== piece.color) {
                    moves.push({
                        from: squareId,
                        to: targetSquare,
                        piece: piece.type,
                        capture: true,
                        capturedPiece: targetPiece.type
                    });
                }
            }
        });

        return moves;
    }

    /**
     * Get valid queen moves (combination of rook and bishop)
     * @param {string} squareId - Square containing the queen
     * @returns {Array} Array of valid moves
     */
    getQueenMoves(squareId) {
        return [...this.getRookMoves(squareId), ...this.getBishopMoves(squareId)];
    }

    /**
     * Get valid king moves
     * @param {string} squareId - Square containing the king
     * @returns {Array} Array of valid moves
     */
    getKingMoves(squareId) {
        const piece = this.board[squareId];
        const moves = [];
        const file = squareId[0];
        const rank = parseInt(squareId[1]);
        
        // Regular king moves (one square in any direction)
        const directions = [
            [0, 1], [0, -1], [1, 0], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];

        directions.forEach(([fileOffset, rankOffset]) => {
            const newFile = String.fromCharCode(file.charCodeAt(0) + fileOffset);
            const newRank = rank + rankOffset;
            const targetSquare = newFile + newRank;

            if (this.isValidSquare(targetSquare)) {
                const targetPiece = this.board[targetSquare];
                
                if (!targetPiece) {
                    moves.push({
                        from: squareId,
                        to: targetSquare,
                        piece: piece.type,
                        capture: false
                    });
                } else if (targetPiece.color !== piece.color) {
                    moves.push({
                        from: squareId,
                        to: targetSquare,
                        piece: piece.type,
                        capture: true,
                        capturedPiece: targetPiece.type
                    });
                }
            }
        });

        // Castling moves
        if (this.canCastle(piece.color, 'kingside')) {
            moves.push({
                from: squareId,
                to: piece.color === 'white' ? 'g1' : 'g8',
                piece: piece.type,
                capture: false,
                castling: 'kingside'
            });
        }

        if (this.canCastle(piece.color, 'queenside')) {
            moves.push({
                from: squareId,
                to: piece.color === 'white' ? 'c1' : 'c8',
                piece: piece.type,
                capture: false,
                castling: 'queenside'
            });
        }

        return moves;
    }

    /**
     * Get moves in a specific direction until blocked
     * @param {string} startSquare - Starting square
     * @param {number} fileDir - File direction (-1, 0, 1)
     * @param {number} rankDir - Rank direction (-1, 0, 1)
     * @param {string} color - Piece color
     * @returns {Array} Array of valid moves in that direction
     */
    getMovesInDirection(startSquare, fileDir, rankDir, color) {
        const moves = [];
        const startFile = startSquare[0];
        const startRank = parseInt(startSquare[1]);
        
        let currentFile = startFile;
        let currentRank = startRank;

        while (true) {
            // Calculate next square
            const nextFileCode = currentFile.charCodeAt(0) + fileDir;
            const nextFile = String.fromCharCode(nextFileCode);
            const nextRank = currentRank + rankDir;
            const nextSquare = nextFile + nextRank;

            // Check if the next square is valid
            if (!this.isValidSquare(nextSquare)) {
                break;
            }

            const targetPiece = this.board[nextSquare];

            // If square is empty, add move and continue
            if (!targetPiece) {
                moves.push({
                    from: startSquare,
                    to: nextSquare,
                    piece: this.board[startSquare].type,
                    capture: false
                });
            } else {
                // If enemy piece, add capture move and stop
                if (targetPiece.color !== color) {
                    moves.push({
                        from: startSquare,
                        to: nextSquare,
                        piece: this.board[startSquare].type,
                        capture: true,
                        capturedPiece: targetPiece.type
                    });
                }
                // Stop in either case (friendly or enemy piece)
                break;
            }

            currentFile = nextFile;
            currentRank = nextRank;
        }

        return moves;
    }

    /**
     * Check if a square identifier is valid
     * @param {string} square - Square identifier (e.g., 'e4')
     * @returns {boolean} True if valid
     */
    isValidSquare(square) {
        if (square.length !== 2) return false;
        const file = square[0];
        const rank = parseInt(square[1]);
        return file >= 'a' && file <= 'h' && rank >= 1 && rank <= 8;
    }

    /**
     * Check if castling is possible
     * @param {string} color - Player color
     * @param {string} side - 'kingside' or 'queenside'
     * @returns {boolean} True if castling is legal
     */
    canCastle(color, side) {
        // Check if player has castling rights
        if (!this.castlingRights[color][side]) {
            return false;
        }

        // Check if king is in check
        if (this.isInCheck(color)) {
            return false;
        }

        const rank = color === 'white' ? '1' : '8';
        const kingSquare = 'e' + rank;
        
        let rookSquare, squares, kingDestination;
        
        if (side === 'kingside') {
            rookSquare = 'h' + rank;
            squares = ['f' + rank, 'g' + rank];
            kingDestination = 'g' + rank;
        } else {
            rookSquare = 'a' + rank;
            squares = ['b' + rank, 'c' + rank, 'd' + rank];
            kingDestination = 'c' + rank;
        }

        // Check if rook is still there
        const rook = this.board[rookSquare];
        if (!rook || rook.type !== 'rook' || rook.color !== color) {
            return false;
        }

        // Check if squares between king and rook are empty
        for (let square of squares) {
            if (this.board[square]) {
                return false;
            }
        }

        // Check if king would pass through or end up in check
        const criticalSquares = side === 'kingside' ? 
            ['f' + rank, 'g' + rank] : ['c' + rank, 'd' + rank];
            
        for (let square of criticalSquares) {
            if (this.wouldSquareBeAttacked(square, color)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if making a move would leave the king in check
     * @param {Object} move - Move object
     * @returns {boolean} True if move would leave king in check
     */
    wouldLeaveKingInCheck(move) {
        // Make temporary move
        const originalBoard = this.cloneBoard();
        const originalKingPos = {...this.kingPositions};
        
        this.executeMoveOnBoard(move);
        
        // Check if king is in check after the move
        const inCheck = this.isInCheck(this.currentPlayer);
        
        // Restore board state
        this.board = originalBoard;
        this.kingPositions = originalKingPos;
        
        return inCheck;
    }

    /**
     * Clone the current board state
     * @returns {Object} Deep copy of the board
     */
    cloneBoard() {
        const clone = {};
        for (let square in this.board) {
            if (this.board[square]) {
                clone[square] = {...this.board[square]};
            } else {
                clone[square] = null;
            }
        }
        return clone;
    }

    /**
     * Execute a move on the board (for validation purposes)
     * @param {Object} move - Move object
     */
    executeMoveOnBoard(move) {
        const piece = this.board[move.from];
        
        // Handle special moves
        if (move.castling) {
            this.executeCastlingOnBoard(move);
            return;
        }
        
        if (move.enPassant) {
            const captureRank = piece.color === 'white' ? '5' : '4';
            const captureSquare = move.to[0] + captureRank;
            this.board[captureSquare] = null;
        }
        
        // Update king position
        if (piece.type === 'king') {
            this.kingPositions[piece.color] = move.to;
        }
        
        // Make the move
        this.board[move.to] = move.promotion ? 
            { type: move.promotion, color: piece.color } : piece;
        this.board[move.from] = null;
    }

    /**
     * Execute castling on the board
     * @param {Object} move - Castling move object
     */
    executeCastlingOnBoard(move) {
        const color = this.board[move.from].color;
        const rank = color === 'white' ? '1' : '8';
        
        if (move.castling === 'kingside') {
            // Move king
            this.board['g' + rank] = this.board['e' + rank];
            this.board['e' + rank] = null;
            this.kingPositions[color] = 'g' + rank;
            
            // Move rook
            this.board['f' + rank] = this.board['h' + rank];
            this.board['h' + rank] = null;
        } else {
            // Move king
            this.board['c' + rank] = this.board['e' + rank];
            this.board['e' + rank] = null;
            this.kingPositions[color] = 'c' + rank;
            
            // Move rook
            this.board['d' + rank] = this.board['a' + rank];
            this.board['a' + rank] = null;
        }
    }

    /**
     * Check if a player is in check
     * @param {string} color - Player color
     * @returns {boolean} True if in check
     */
    isInCheck(color) {
        const kingSquare = this.kingPositions[color];
        return this.wouldSquareBeAttacked(kingSquare, color);
    }

    /**
     * Check if a square would be attacked by the opponent
     * @param {string} square - Square to check
     * @param {string} defendingColor - Color of the defender
     * @returns {boolean} True if square is attacked
     */
    wouldSquareBeAttacked(square, defendingColor) {
        const attackingColor = defendingColor === 'white' ? 'black' : 'white';
        
        // Check all opponent pieces for attacks on this square
        for (let squareId in this.board) {
            const piece = this.board[squareId];
            if (piece && piece.color === attackingColor) {
                if (this.pieceAttacksSquare(squareId, square)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check if a piece attacks a specific square
     * @param {string} pieceSquare - Square containing the attacking piece
     * @param {string} targetSquare - Target square
     * @returns {boolean} True if piece attacks the target
     */
    pieceAttacksSquare(pieceSquare, targetSquare) {
        const piece = this.board[pieceSquare];
        if (!piece) return false;
        
        const file1 = pieceSquare[0];
        const rank1 = parseInt(pieceSquare[1]);
        const file2 = targetSquare[0];
        const rank2 = parseInt(targetSquare[1]);
        
        const fileOffset = file2.charCodeAt(0) - file1.charCodeAt(0);
        const rankOffset = rank2 - rank1;
        
        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? 1 : -1;
                return rankOffset === direction && Math.abs(fileOffset) === 1;
                
            case 'rook':
                if (fileOffset === 0 || rankOffset === 0) {
                    return this.isPathClear(pieceSquare, targetSquare);
                }
                return false;
                
            case 'bishop':
                if (Math.abs(fileOffset) === Math.abs(rankOffset)) {
                    return this.isPathClear(pieceSquare, targetSquare);
                }
                return false;
                
            case 'knight':
                return (Math.abs(fileOffset) === 2 && Math.abs(rankOffset) === 1) ||
                       (Math.abs(fileOffset) === 1 && Math.abs(rankOffset) === 2);
                       
            case 'queen':
                if (fileOffset === 0 || rankOffset === 0 || 
                    Math.abs(fileOffset) === Math.abs(rankOffset)) {
                    return this.isPathClear(pieceSquare, targetSquare);
                }
                return false;
                
            case 'king':
                return Math.abs(fileOffset) <= 1 && Math.abs(rankOffset) <= 1;
                
            default:
                return false;
        }
    }

    /**
     * Check if the path between two squares is clear
     * @param {string} from - Starting square
     * @param {string} to - Ending square
     * @returns {boolean} True if path is clear
     */
    isPathClear(from, to) {
        if (from === to) return true;
        
        const file1 = from[0];
        const rank1 = parseInt(from[1]);
        const file2 = to[0];
        const rank2 = parseInt(to[1]);
        
        const fileOffset = file2.charCodeAt(0) - file1.charCodeAt(0);
        const rankOffset = rank2 - rank1;
        
        // Determine direction
        const fileDir = fileOffset === 0 ? 0 : (fileOffset > 0 ? 1 : -1);
        const rankDir = rankOffset === 0 ? 0 : (rankOffset > 0 ? 1 : -1);
        
        // Check each square in the path
        let currentFile = file1;
        let currentRank = rank1;
        
        while (true) {
            currentFile = String.fromCharCode(currentFile.charCodeAt(0) + fileDir);
            currentRank += rankDir;
            
            const currentSquare = currentFile + currentRank;
            
            // If we've reached the destination, path is clear
            if (currentSquare === to) {
                return true;
            }
            
            // If there's a piece in the way, path is blocked
            if (this.board[currentSquare]) {
                return false;
            }
        }
    }

    /**
     * Make a move on the board
     * @param {Object} move - Move object
     */
    makeMove(move) {
        const piece = this.board[move.from];
        const capturedPiece = this.board[move.to];
        
        // Store move in history
        const moveNotation = this.generateMoveNotation(move);
        this.moveHistory.push({
            move: move,
            notation: moveNotation,
            capturedPiece: capturedPiece,
            castlingRights: {...this.castlingRights},
            enPassantTarget: this.enPassantTarget,
            halfMoveClock: this.halfMoveClock
        });
        
        // Handle captured pieces
        if (move.capture) {
            if (move.enPassant) {
                const captureRank = piece.color === 'white' ? '5' : '4';
                const captureSquare = move.to[0] + captureRank;
                const capturedPawn = this.board[captureSquare];
                this.capturedPieces[capturedPawn.color].push(capturedPawn.type);
                this.board[captureSquare] = null;
            } else {
                this.capturedPieces[capturedPiece.color].push(capturedPiece.type);
            }
            this.halfMoveClock = 0; // Reset on capture
        } else if (piece.type === 'pawn') {
            this.halfMoveClock = 0; // Reset on pawn move
        } else {
            this.halfMoveClock++;
        }

        // Handle special moves
        if (move.castling) {
            this.executeCastling(move);
        } else {
            // Regular move
            this.board[move.to] = move.promotion ? 
                { type: move.promotion, color: piece.color } : piece;
            this.board[move.from] = null;
            
            // Update king position
            if (piece.type === 'king') {
                this.kingPositions[piece.color] = move.to;
            }
        }

        // Update castling rights
        this.updateCastlingRights(move);
        
        // Set en passant target
        this.setEnPassantTarget(move);
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Increment full move number
        if (this.currentPlayer === 'white') {
            this.fullMoveNumber++;
        }
        
        // Check game status
        this.checkGameStatus();
        
        // Update display
        this.updateDisplay();
        this.updateLastMoveHighlight(move);
    }

    /**
     * Execute castling move
     * @param {Object} move - Castling move object
     */
    executeCastling(move) {
        const color = this.board[move.from].color;
        const rank = color === 'white' ? '1' : '8';
        
        if (move.castling === 'kingside') {
            // Move king
            this.board['g' + rank] = this.board['e' + rank];
            this.board['e' + rank] = null;
            this.kingPositions[color] = 'g' + rank;
            
            // Move rook
            this.board['f' + rank] = this.board['h' + rank];
            this.board['h' + rank] = null;
        } else {
            // Move king
            this.board['c' + rank] = this.board['e' + rank];
            this.board['e' + rank] = null;
            this.kingPositions[color] = 'c' + rank;
            
            // Move rook
            this.board['d' + rank] = this.board['a' + rank];
            this.board['a' + rank] = null;
        }
    }

    /**
     * Update castling rights based on the move
     * @param {Object} move - Move object
     */
    updateCastlingRights(move) {
        const piece = this.board[move.to] || this.board[move.from];
        
        // If king moves, lose all castling rights for that color
        if (piece.type === 'king') {
            this.castlingRights[piece.color].kingside = false;
            this.castlingRights[piece.color].queenside = false;
        }
        
        // If rook moves or is captured, lose castling rights for that side
        if (move.from === 'a1' || move.to === 'a1') {
            this.castlingRights.white.queenside = false;
        }
        if (move.from === 'h1' || move.to === 'h1') {
            this.castlingRights.white.kingside = false;
        }
        if (move.from === 'a8' || move.to === 'a8') {
            this.castlingRights.black.queenside = false;
        }
        if (move.from === 'h8' || move.to === 'h8') {
            this.castlingRights.black.kingside = false;
        }
    }

    /**
     * Set en passant target square
     * @param {Object} move - Move object
     */
    setEnPassantTarget(move) {
        const piece = this.board[move.to] || this.board[move.from];
        
        // Reset en passant target
        this.enPassantTarget = null;
        
        // Set if pawn moved two squares
        if (piece.type === 'pawn') {
            const fromRank = parseInt(move.from[1]);
            const toRank = parseInt(move.to[1]);
            
            if (Math.abs(toRank - fromRank) === 2) {
                const targetRank = piece.color === 'white' ? fromRank + 1 : fromRank - 1;
                this.enPassantTarget = move.from[0] + targetRank;
            }
        }
    }

    /**
     * Generate chess notation for a move
     * @param {Object} move - Move object
     * @returns {string} Chess notation
     */
    generateMoveNotation(move) {
        const piece = this.board[move.from];
        let notation = '';
        
        if (move.castling) {
            return move.castling === 'kingside' ? 'O-O' : 'O-O-O';
        }
        
        // Piece symbol (except for pawns)
        if (piece.type !== 'pawn') {
            notation += piece.type.charAt(0).toUpperCase();
        }
        
        // Capture notation
        if (move.capture) {
            if (piece.type === 'pawn') {
                notation += move.from[0]; // file of pawn
            }
            notation += 'x';
        }
        
        // Destination square
        notation += move.to;
        
        // Promotion
        if (move.promotion) {
            notation += '=' + move.promotion.charAt(0).toUpperCase();
        }
        
        // En passant
        if (move.enPassant) {
            notation += ' e.p.';
        }
        
        return notation;
    }

    /**
     * Check the current game status
     */
    checkGameStatus() {
        const inCheck = this.isInCheck(this.currentPlayer);
        const hasValidMoves = this.hasValidMoves(this.currentPlayer);
        
        if (inCheck) {
            if (!hasValidMoves) {
                // Checkmate
                this.gameOver = true;
                this.gameStatus = 'checkmate';
                const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
                this.showMessage(`Checkmate! ${winner} wins!`);
            } else {
                // Check
                this.gameStatus = 'check';
            }
        } else if (!hasValidMoves) {
            // Stalemate
            this.gameOver = true;
            this.gameStatus = 'stalemate';
            this.showMessage('Stalemate! The game is a draw.');
        } else if (this.halfMoveClock >= 100) {
            // Fifty-move rule
            this.gameOver = true;
            this.gameStatus = 'draw';
            this.showMessage('Draw by fifty-move rule!');
        } else if (this.isInsufficientMaterial()) {
            // Insufficient material
            this.gameOver = true;
            this.gameStatus = 'draw';
            this.showMessage('Draw by insufficient material!');
        } else {
            this.gameStatus = 'active';
        }
    }

    /**
     * Check if a player has any valid moves
     * @param {string} color - Player color
     * @returns {boolean} True if player has valid moves
     */
    hasValidMoves(color) {
        for (let square in this.board) {
            const piece = this.board[square];
            if (piece && piece.color === color) {
                const moves = this.getValidMovesForPiece(square);
                if (moves.length > 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if there is insufficient material for checkmate
     * @returns {boolean} True if insufficient material
     */
    isInsufficientMaterial() {
        const pieces = { white: [], black: [] };
        
        // Count remaining pieces
        for (let square in this.board) {
            const piece = this.board[square];
            if (piece) {
                pieces[piece.color].push(piece.type);
            }
        }
        
        // Check various insufficient material scenarios
        const whitePieces = pieces.white.sort();
        const blackPieces = pieces.black.sort();
        
        // King vs King
        if (whitePieces.length === 1 && blackPieces.length === 1) {
            return true;
        }
        
        // King vs King + Bishop
        if ((whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.includes('bishop')) ||
            (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.includes('bishop'))) {
            return true;
        }
        
        // King vs King + Knight
        if ((whitePieces.length === 1 && blackPieces.length === 2 && blackPieces.includes('knight')) ||
            (blackPieces.length === 1 && whitePieces.length === 2 && whitePieces.includes('knight'))) {
            return true;
        }
        
        return false;
    }

    /**
     * Update the game display
     */
    updateDisplay() {
        this.updateBoard();
        this.updateCurrentPlayer();
        this.updateGameStatus();
        this.updateCapturedPieces();
        this.updateMoveHistory();
        this.updateCheckHighlight();
    }

    /**
     * Update the visual board
     */
    updateBoard() {
        for (let square in this.board) {
            const squareElement = document.getElementById(square);
            const piece = this.board[square];
            
            // Clear existing piece
            const existingPiece = squareElement.querySelector('.piece');
            if (existingPiece) {
                existingPiece.remove();
            }
            
            // Add new piece if it exists
            if (piece) {
                squareElement.appendChild(this.createPieceElement(piece));
            }
        }
    }

    /**
     * Update current player display
     */
    updateCurrentPlayer() {
        const display = document.getElementById('currentPlayerDisplay');
        const pieceSymbol = this.currentPlayer === 'white' ? '♔' : '♚';
        const playerName = this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1);
        
        display.innerHTML = `
            <span class="player-piece">${pieceSymbol}</span>
            <span class="player-name">${playerName}</span>
        `;
    }

    /**
     * Update game status display
     */
    updateGameStatus() {
        const display = document.getElementById('gameStatusDisplay');
        let message = '';
        let className = '';
        
        switch (this.gameStatus) {
            case 'active':
                message = 'Game in progress';
                break;
            case 'check':
                message = `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} is in check!`;
                className = 'check';
                break;
            case 'checkmate':
                const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
                message = `Checkmate! ${winner} wins!`;
                className = 'checkmate';
                break;
            case 'stalemate':
                message = 'Stalemate - Draw!';
                className = 'checkmate';
                break;
            case 'draw':
                message = 'Game drawn!';
                className = 'checkmate';
                break;
        }
        
        display.textContent = message;
        display.className = `status-message ${className}`;
    }

    /**
     * Update captured pieces display
     */
    updateCapturedPieces() {
        const whiteDisplay = document.getElementById('capturedWhite');
        const blackDisplay = document.getElementById('capturedBlack');
        
        const symbols = {
            king: '♔', queen: '♕', rook: '♖',
            bishop: '♗', knight: '♘', pawn: '♙'
        };
        
        whiteDisplay.innerHTML = this.capturedPieces.white.map(piece => 
            `<span class="captured-piece">${symbols[piece]}</span>`
        ).join('');
        
        blackDisplay.innerHTML = this.capturedPieces.black.map(piece => 
            `<span class="captured-piece">${symbols[piece]}</span>`
        ).join('');
    }

    /**
     * Update move history display
     */
    updateMoveHistory() {
        const display = document.getElementById('moveHistoryList');
        display.innerHTML = '';
        
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.moveHistory[i];
            const blackMove = this.moveHistory[i + 1];
            
            const movePair = document.createElement('div');
            movePair.className = 'move-pair';
            
            movePair.innerHTML = `
                <div class="move-number">${moveNumber}.</div>
                <div class="move-notation white">${whiteMove.notation}</div>
                <div class="move-notation black">${blackMove ? blackMove.notation : ''}</div>
            `;
            
            display.appendChild(movePair);
        }
        
        // Scroll to bottom
        display.scrollTop = display.scrollHeight;
    }

    /**
     * Update check highlight
     */
    updateCheckHighlight() {
        // Clear previous check highlights
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('in-check');
        });
        
        // Highlight king if in check
        if (this.gameStatus === 'check') {
            const kingSquare = this.kingPositions[this.currentPlayer];
            document.getElementById(kingSquare).classList.add('in-check');
        }
    }

    /**
     * Update last move highlight
     * @param {Object} move - The last move made
     */
    updateLastMoveHighlight(move) {
        // Clear previous last move highlights
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('last-move');
        });
        
        // Highlight last move squares
        if (move) {
            document.getElementById(move.from).classList.add('last-move');
            document.getElementById(move.to).classList.add('last-move');
        }
    }

    /**
     * Start a new game
     */
    newGame() {
        // Reset all game state
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.gameOver = false;
        this.gameStatus = 'active';
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.enPassantTarget = null;
        this.kingPositions = { white: 'e1', black: 'e8' };
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.selectedSquare = null;
        this.validMoves = [];
        
        // Update display
        this.updateDisplay();
        this.hideMessage();
        
        // Clear highlights
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'valid-capture', 'last-move', 'in-check');
        });
    }

    /**
     * Undo the last move
     */
    undoLastMove() {
        if (this.moveHistory.length === 0 || this.gameOver) {
            return;
        }
        
        const lastMoveData = this.moveHistory.pop();
        const move = lastMoveData.move;
        
        // Restore board state
        this.board[move.from] = this.board[move.to];
        
        if (move.promotion) {
            // Restore original pawn
            this.board[move.from] = { type: 'pawn', color: this.currentPlayer === 'white' ? 'black' : 'white' };
        }
        
        if (move.capture) {
            if (move.enPassant) {
                // Restore captured pawn
                const captureRank = this.currentPlayer === 'white' ? '5' : '4';
                const captureSquare = move.to[0] + captureRank;
                this.board[captureSquare] = { type: 'pawn', color: this.currentPlayer };
                this.board[move.to] = null;
            } else {
                // Restore captured piece
                this.board[move.to] = lastMoveData.capturedPiece;
            }
            
            // Remove from captured pieces
            const capturedPieceType = move.capturedPiece;
            const capturedPieceColor = move.enPassant ? this.currentPlayer : lastMoveData.capturedPiece.color;
            const capturedArray = this.capturedPieces[capturedPieceColor];
            const index = capturedArray.lastIndexOf(capturedPieceType);
            if (index > -1) {
                capturedArray.splice(index, 1);
            }
        } else {
            this.board[move.to] = null;
        }
        
        // Handle special moves
        if (move.castling) {
            this.undoCastling(move);
        }
        
        // Update king position
        const piece = this.board[move.from];
        if (piece && piece.type === 'king') {
            this.kingPositions[piece.color] = move.from;
        }
        
        // Restore game state
        this.castlingRights = lastMoveData.castlingRights;
        this.enPassantTarget = lastMoveData.enPassantTarget;
        this.halfMoveClock = lastMoveData.halfMoveClock;
        
        // Switch players back
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Decrement full move number
        if (this.currentPlayer === 'black') {
            this.fullMoveNumber--;
        }
        
        // Reset game status
        this.gameOver = false;
        this.checkGameStatus();
        
        // Clear selection
        this.deselectSquare();
        
        // Update display
        this.updateDisplay();
        this.hideMessage();
        
        // Update last move highlight
        if (this.moveHistory.length > 0) {
            const previousMove = this.moveHistory[this.moveHistory.length - 1].move;
            this.updateLastMoveHighlight(previousMove);
        } else {
            this.updateLastMoveHighlight(null);
        }
    }

    /**
     * Undo castling move
     * @param {Object} move - Castling move to undo
     */
    undoCastling(move) {
        const color = this.currentPlayer === 'white' ? 'black' : 'white';
        const rank = color === 'white' ? '1' : '8';
        
        if (move.castling === 'kingside') {
            // Move king back
            this.board['e' + rank] = this.board['g' + rank];
            this.board['g' + rank] = null;
            this.kingPositions[color] = 'e' + rank;
            
            // Move rook back
            this.board['h' + rank] = this.board['f' + rank];
            this.board['f' + rank] = null;
        } else {
            // Move king back
            this.board['e' + rank] = this.board['c' + rank];
            this.board['c' + rank] = null;
            this.kingPositions[color] = 'e' + rank;
            
            // Move rook back
            this.board['a' + rank] = this.board['d' + rank];
            this.board['d' + rank] = null;
        }
    }

    /**
     * Show a message to the user
     * @param {string} message - Message to display
     */
    showMessage(message) {
        const messageElement = document.getElementById('gameMessage');
        const messageText = document.getElementById('messageText');
        
        messageText.textContent = message;
        messageElement.classList.remove('hidden');
    }

    /**
     * Hide the message
     */
    hideMessage() {
        const messageElement = document.getElementById('gameMessage');
        messageElement.classList.add('hidden');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chessGame = new ChessGame();
});
