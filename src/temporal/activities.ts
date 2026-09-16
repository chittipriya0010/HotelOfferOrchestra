import axios from 'axios';
import { saveToRedis } from '../redis/hotel.repository.js';
import type { Hotel } from '../types/hotel.js';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

export async function fetchSupplierA(city: string): Promise<Hotel[]> {
  try {
    const res = await axios.get(`${BASE_URL}/supplierA/hotels?city=${city}`);
    return res.data;
  } catch (error) {
    console.error('[Activity] Supplier A fetch failed');
    return []; 
  }
}

export async function fetchSupplierB(city: string): Promise<Hotel[]> {
  try {
    const res = await axios.get(`${BASE_URL}/supplierB/hotels?city=${city}`);
    return res.data;
  } catch (error) {
    console.error('[Activity] Supplier B fetch failed');
    return [];
  }
}

export async function saveHotelsToRedis(city: string, hotels: Hotel[]): Promise<void> {
  await saveToRedis(city, hotels);
}