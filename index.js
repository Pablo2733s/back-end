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
  host: 'monorail.proxy.rlwy.net',
  user: 'root',
  password: 'DED-EaaFH24H3b31Dcebacba2Df-BhEb',
  database: 'teste',
  port: 50226
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
    const token = jwt.sign({ id: usuarioAutenticado.id, email: usuarioAutenticado.email }, segredoJWT, { expiresIn: '7d' });

    res.json({ mensagem: 'Login realizado com sucesso!', token });
  });
});

app.post('/coments', verificarToken, (req, res) => {
  const { comentario, avaliacao } = req.body;
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

app.get('/buscarcoments', (req, res) => {
  // Buscar os últimos 3 comentários do banco de dados
  const buscarComentariosQuery = 'SELECT * FROM coments ORDER BY id DESC LIMIT 3';
  
  connection.query(buscarComentariosQuery, (err, resultados) => {
    if (err) {
      console.error('Erro ao buscar comentários:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao buscar comentários.', error: err.message });
    }

    res.json({ mensagem: 'Comentários recuperados com sucesso!', comentarios: resultados });
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

app.post('/comprar', verificarToken, (req, res) => {
  // Verifica se o corpo da requisição contém as informações necessárias
  if (!req.body.name_jogo || !req.body.preco) {
    return res.status(400).json({ error: "Dados incompletos. Certifique-se de enviar name_jogo e preco." });
  }

  // Obtém o userid do token verificado
  const userid = req.usuario.id;

  // Adiciona a compra à simulação do banco de dados
  const novaCompra = {
    userid: userid,
    name_jogo: req.body.name_jogo,
    preco: req.body.preco
  };

  // Simule a inserção no banco de dados
  // Substitua isso pela lógica real de inserção no banco de dados
  // Certifique-se de ter uma tabela "compras" no seu banco de dados
  connection.query('INSERT INTO compras SET ?', novaCompra, (err, resultado) => {
    if (err) {
      console.error('Erro ao adicionar compra:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao adicionar compra.', error: err.message });
    }

    res.status(200).json({ mensagem: "Compra realizada com sucesso.", compra: novaCompra });
  });
});

app.get('/historico', verificarToken, (req, res) => {
  // Obtém o userid do token verificado
  const userid = req.usuario.id;

  // Busca as compras do usuário no banco de dados
  const buscarComprasQuery = 'SELECT id, name_jogo, preco FROM compras WHERE userid = ?';

  connection.query(buscarComprasQuery, [userid], (err, resultados) => {
    if (err) {
      console.error('Erro ao buscar histórico de compras:', err);
      return res.status(500).json({ mensagem: 'Erro interno do servidor ao buscar histórico de compras.', error: err.message });
    }

    res.json({ mensagem: 'Histórico de compras recuperado com sucesso!', compras: resultados });
  });
});
