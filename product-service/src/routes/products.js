import { Router } from 'express';
import Product from '../models/Product.js';

const router = Router();


router.get('/health', (_, res) => res.json({ ok: true, service: 'product-service' }));

router.post('/', async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    const productRepository = req.AppDataSource.getRepository(Product);
    const product = productRepository.create({ name, price, stock });
    const savedProduct = await productRepository.save(product);
    res.status(201).json(savedProduct);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const productRepository = req.AppDataSource.getRepository(Product);
    const products = await productRepository.find({
      order: { createdAt: 'DESC' }
    });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const productRepository = req.AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'not found' });
    res.json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const productRepository = req.AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'not found' });
    
    productRepository.merge(product, req.body);
    const updatedProduct = await productRepository.save(product);
    res.json(updatedProduct);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const productRepository = req.AppDataSource.getRepository(Product);
    const product = await productRepository.findOne({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'not found' });
    
    await productRepository.remove(product);
    res.json({ deleted: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
