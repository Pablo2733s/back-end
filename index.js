const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3540;

const segredoJWT = 'seuSegredoSuperSecreto';

app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
  host: 'viaduct.proxy.rlwy.net',
  user: 'root',
  password: 'hch2DgbAfd4CaCd26GddeCeFe4Gf5DDh',
  database: 'teste',
  port: 56285
};

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.stack);
    return;
  }
  console.log('Conectado ao banco de dados como ID', connection.threadId);
});

function verificarToken(req, res, next) {
  const tokenHeader = req.headers['authorization'];

  if (!tokenHeader) {
    return res.status(403).json({ mensagem: 'Token não fornecido.' });
  }

  if (!tokenHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensagem: 'Formato inválido de token.' });
  }

  const token = tokenHeader.substring(7);

  jwt.verify(token, segredoJWT, (err, decoded) => {
    if (err) {
      return res.status(401).json({ mensagem: 'Token inválido.' });
    }

    req.usuario = decoded;
    next();
  });
}

app.post('/cadastrar', (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ mensagem: 'Informe nome, email e senha para cadastrar um usuário.' });
  }

  const cadastrarUsuarioQuery = 'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)';
  connection.query(cadastrarUsuarioQuery, [nome, email, senha], (err, resultado) => {
    if (err) {
      console.error('Erro ao cadastrar usuário:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao cadastrar usuário.', error: err.message });
    }

    res.json({ mensagem: 'Usuário cadastrado com sucesso!', id: resultado.insertId });
  });
});

app.post('/inserir', (req, res) => {
  const { name_grupo, number_pess, password } = req.body;

  if (!name_grupo || !number_pess || !password) {
    return res.status(400).json({ mensagem: 'Informe nome do grupo, número de pessoas e senha para inserir no banco de dados.' });
  }

  const inserirGrupoQuery = 'INSERT INTO grupos (name_grupo, number_pess, password) VALUES (?, ?, ?)';
  connection.query(inserirGrupoQuery, [name_grupo, number_pess, password], (err, resultado) => {
    if (err) {
      console.error('Erro ao inserir grupo:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao inserir grupo.', error: err.message });
    }

    res.json({ mensagem: 'Grupo inserido com sucesso!', id: resultado.insertId });
  });
});

app.post('/action', (req, res) => {
    const { productId, action } = req.body;

    // Verificar se o ID do produto e a ação são fornecidos
    if (!productId || !action) {
        return res.status(400).json({ mensagem: 'ID do produto e ação são necessários.' });
    }

    // Lógica para salvar a ação no banco de dados (por exemplo, tabela 'carrinho')
    const salvarAcaoQuery = 'INSERT INTO carrinho (id_produto, acao) VALUES (?, ?)';
    connection.query(salvarAcaoQuery, [productId, action], (err, resultado) => {
        if (err) {
            console.error('Erro ao salvar ação:', err);
            return res.status(500).json({ mensagem: 'Erro interno do servidor ao salvar ação.', error: err.message });
        }

        res.json({ mensagem: `Ação ${action} para o produto ${productId} salva com sucesso!`, id: resultado.insertId });
    });
});

app.post('/adicionar', verificarToken, (req, res) => {
  const { product_name, descricao, image_url } = req.body;

  if (!product_name || !descricao || !image_url) {
    return res.status(400).json({ mensagem: 'Informe product_name, descricao e image_url para adicionar um produto.' });
  }

  const adicionarProdutoQuery = 'INSERT INTO teste.products (product_name, descricao, image_url) VALUES (?, ?, ?)';
  connection.query(adicionarProdutoQuery, [product_name, descricao, image_url], (err, resultado) => {
    if (err) {
      console.error('Erro ao adicionar produto:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao adicionar produto.', error: err.message });
    }

    res.json({ mensagem: 'Produto adicionado com sucesso!', id: resultado.insertId });
  });
});

app.post('/login', (req, res) => {
  const { identificador, senha } = req.body;

  if (!identificador || !senha) {
    return res.status(400).json({ mensagem: 'Informe o e-mail, nome ou senha para realizar o login.' });
  }

  const loginQuery = 'SELECT * FROM usuarios WHERE (email = ? OR nome = ?)';
  connection.query(loginQuery, [identificador, identificador], (err, resultados) => {
    if (err) {
      console.error('Erro ao realizar o login:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao realizar o login.' });
    }

    if (resultados.length === 0) {
      return res.status(401).json({ mensagem: 'Credenciais inválidas. Usuário não encontrado.' });
    }

    const usuarioAutenticado = resultados[0];

    // Comparar o hash da combinação de email e senha armazenado no banco de dados (removido o uso do bcrypt)

    // Gerar token JWT
    const token = jwt.sign({ id: usuarioAutenticado.id, email: usuarioAutenticado.email }, segredoJWT, { expiresIn: '1h' });

    res.json({ mensagem: 'Login realizado com sucesso!', token });
  });
});
app.post('/coments', verificarToken, (req, res) => {
  const { comentario, avaliacao } = req.body;

  // Certifique-se de que user_id está disponível no corpo da solicitação (depois de verificar o token)
  const user_id = req.usuario.id;

  if (!comentario || !avaliacao || !user_id) {
    return res.status(400).json({ mensagem: 'Informe comentário, avaliação e user_id para adicionar um comentário.' });
  }

  const adicionarComentarioQuery = 'INSERT INTO coments (comentario, avaliacao, user_id) VALUES (?, ?, ?)';
  connection.query(adicionarComentarioQuery, [comentario, avaliacao, user_id], (err, resultado) => {
    if (err) {
      console.error('Erro ao adicionar comentário:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao adicionar comentário.', error: err.message });
    }

    res.json({ mensagem: 'Comentário adicionado com sucesso!', id: resultado.insertId });
  });
});

app.post('/recuperar-senha', (req, res) => {
  const { email } = req.body;

  // Verifique se o e-mail foi fornecido
  if (!email) {
    return res.status(400).json({ mensagem: 'Informe o e-mail para recuperar a senha.' });
  }

  // Lógica para gerar um token de redefinição de senha e enviá-lo ao usuário
  // Neste exemplo, apenas retornamos um sucesso simulado
  res.json({ mensagem: 'Instruções de recuperação de senha enviadas para o seu e-mail.' });
});



// Exemplo de rota protegida
app.get('/rota-protegida', verificarToken, (req, res) => {
  res.json({ mensagem: 'Rota protegida alcançada!', usuario: req.usuario });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

app.put('/editar-conta', verificarToken, (req, res) => {
  const userId = req.usuario.id;
  const { nome, email, senha } = req.body;

  // Atualizar informações da conta do usuário
  const editarInfoContaQuery = 'UPDATE usuarios SET nome = ?, email = ?, senha = ? WHERE id = ?';

  connection.query(editarInfoContaQuery, [nome, email, senha, userId], (err, resultado) => {
    if (err) {
      console.error('Erro ao editar informações da conta:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao editar informações da conta.', error: err.message });
    }

    res.json({ mensagem: 'Informações da conta atualizadas com sucesso!' });
  });
});

app.post('/alterar', verificarToken, (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  const userId = req.usuario.id;

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ mensagem: 'Informe a senha atual e a nova senha para alterar a senha.' });
  }

  // Verificar a senha atual no banco de dados
  const verificarSenhaQuery = 'SELECT senha FROM usuarios WHERE id = ?';
  connection.query(verificarSenhaQuery, [userId], (err, resultados) => {
    if (err) {
      console.error('Erro ao verificar a senha atual:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao verificar a senha atual.', error: err.message });
    }

    if (resultados.length === 0) {
      return res.status(401).json({ mensagem: 'Usuário não encontrado.' });
    }

    const senhaArmazenada = resultados[0].senha;

    // Comparar a senha atual fornecida com a senha armazenada no banco de dados
    // (Você pode usar bibliotecas como bcrypt para uma verificação segura de senhas)
    if (senhaAtual !== senhaArmazenada) {
      return res.status(401).json({ mensagem: 'Senha atual incorreta.' });
    }

    // Agora, atualize a senha no banco de dados
    const atualizarSenhaQuery = 'UPDATE usuarios SET senha = ? WHERE id = ?';
    connection.query(atualizarSenhaQuery, [novaSenha, userId], (err, resultado) => {
      if (err) {
        console.error('Erro ao atualizar a senha:', err);
        return res.status(500).json({ mensagem: 'Erro interno do servidor ao atualizar a senha.', error: err.message });
      }

      res.json({ mensagem: 'Senha alterada com sucesso!' });
    });
  });
});


app.get('/historico-compras', verificarToken, (req, res) => {
  const userId = req.usuario.id;

  // Recuperar histórico de compras do usuário
  const historicoComprasQuery = 'SELECT * FROM historico_compras WHERE user_id = ?';

  connection.query(historicoComprasQuery, [userId], (err, resultados) => {
    if (err) {
      console.error('Erro ao recuperar histórico de compras:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao recuperar histórico de compras.', error: err.message });
    }

    res.json({ mensagem: 'Histórico de compras recuperado com sucesso!', historicoCompras: resultados });
  });
});
