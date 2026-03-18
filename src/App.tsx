import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Coins, 
  Factory, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Check,
  Trash2,
  LogIn,
  LogOut,
  Trophy,
  User as UserIcon,
  Menu,
  X,
  Repeat,
  MessageSquare,
  Award,
  Calendar,
  Zap,
  Save,
  Home,
  Shield,
  Sword,
  Skull,
  Gift,
  Timer,
  Users,
  User,
  Map as MapIcon,
  Compass,
  Navigation,
  Hammer,
  Eraser,
  Globe,
  Box,
  RefreshCw
} from 'lucide-react';
import { 
  ITEMS, ItemData, NPC_TRADES, NPCTrade, RANKS, Rank, 
  CITY_STRUCTURES, CityStructure, GAME_EVENTS, GameEvent, 
  WORKERS, Worker, MapTile, BLOCKS, Block, WORLD_COSTS, MAP_REFRESH_COST 
} from './constants';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot, getDocFromServer 
} from './firebase';

// --- TYPES ---
interface UserData {
  uid: string;
  displayName: string;
  balance: number;
  factories: Record<string, number>;
  warehouse: Record<string, number>;
  city: Record<string, number>;
  workers: Record<string, number>;
  worlds: { id: number; name: string; isUnlocked: boolean; map: MapTile[][] }[];
  currentWorldIndex: number;
  inventory: Record<string, number>;
  currentRankId: string | null;
  lastDailyReward: number;
  lastUpdated: string;
}

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  balance: number;
}

export default function App() {
  // --- AUTH STATE ---
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // --- GAME STATE ---
  const [balance, setBalance] = useState<number>(100000);
  const [factories, setFactories] = useState<Record<string, number>>({});
  const [warehouse, setWarehouse] = useState<Record<string, number>>({});
  const [currentRankId, setCurrentRankId] = useState<string | null>(null);
  const [lastDailyReward, setLastDailyReward] = useState<number>(0);
  const [displayName, setDisplayName] = useState('');

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'market' | 'warehouse' | 'leaderboard' | 'npc' | 'ranks' | 'city' | 'workers' | 'map' | 'marketblok'>('market');
  const [notifications, setNotifications] = useState<{ id: number; text: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- CITY & EVENTS & WORKERS & MAP ---
  const [city, setCity] = useState<Record<string, number>>({});
  const [workers, setWorkers] = useState<Record<string, number>>({});
  const [activeEvent, setActiveEvent] = useState<{ id: string; endTime: number } | null>(null);
  const [raidTimer, setRaidTimer] = useState<number>(0);
  const [mapPosition, setMapPosition] = useState({ x: 5, y: 5 });
  const [gameMap, setGameMap] = useState<MapTile[][]>([]);
  const [worlds, setWorlds] = useState<{ id: number; name: string; isUnlocked: boolean; map: MapTile[][] }[]>(
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      name: `Dünya ${i + 1}`,
      isUnlocked: i === 0,
      map: []
    }))
  );
  const [currentWorldIndex, setCurrentWorldIndex] = useState(0);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [buildMode, setBuildMode] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [buyAmounts, setBuyAmounts] = useState<Record<string, string>>({});
  const [tradeAmounts, setTradeAmounts] = useState<Record<string, string>>({});

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- NOTIFICATION HELPER ---
  const notify = (text: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // --- AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Load data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as any;
          setBalance(data.balance || 0);
          setFactories(data.factories || {});
          setWarehouse(data.warehouse || {});
          setCity(data.city || {});
          setWorkers(data.workers || {});
          
          // Deserialize worlds map
          const loadedWorlds = (data.worlds || []).map((w: any) => ({
            ...w,
            map: typeof w.map === 'string' ? JSON.parse(w.map) : (Array.isArray(w.map) ? w.map : [])
          }));
          
          setWorlds(loadedWorlds.length > 0 ? loadedWorlds : Array.from({ length: 5 }, (_, i) => ({ id: i, name: `Dünya ${i + 1}`, isUnlocked: i === 0, map: [] })));
          setCurrentWorldIndex(data.currentWorldIndex || 0);
          setInventory(data.inventory || {});
          setCurrentRankId(data.currentRankId || null);
          setLastDailyReward(data.lastDailyReward || 0);
          setDisplayName(data.displayName || user.displayName || 'Çiftçi');
        } else {
          // New user initialization
          const newData: any = {
            uid: user.uid,
            displayName: user.displayName || 'Yeni Çiftçi',
            balance: 100000,
            factories: {},
            warehouse: {},
            city: {},
            workers: {},
            worlds: Array.from({ length: 5 }, (_, i) => ({ id: i, name: `Dünya ${i + 1}`, isUnlocked: i === 0, map: JSON.stringify([]) })),
            currentWorldIndex: 0,
            inventory: {},
            currentRankId: null,
            lastDailyReward: 0,
            lastUpdated: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), newData);
          setBalance(100000);
          setFactories({});
          setWarehouse({});
          setCity({});
          setWorkers({});
          setDisplayName(newData.displayName);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // --- LEADERBOARD LISTENER ---
  useEffect(() => {
    // Leaderboard should be accessible even if auth is not ready or user is null
    const q = query(collection(db, 'users'), orderBy('balance', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName || 'Anonim Çiftçi',
        balance: doc.data().balance || 0
      }));
      setLeaderboard(entries);
    }, (error) => {
      console.error("Leaderboard error:", error);
      notify('Sıralama yüklenirken hata oluştu!', 'error');
    });
    return () => unsubscribe();
  }, []);

  // --- MAP GENERATION ---
  const generateMap = useCallback((isRefresh = false) => {
    const size = 15;
    const newMap: MapTile[][] = [];
    for (let y = 0; y < size; y++) {
      const row: MapTile[] = [];
      for (let x = 0; x < size; x++) {
        const rand = Math.random();
        if (rand < 0.05) {
          row.push({ type: 'valley', content: { bonus: Math.floor(Math.random() * 50000) + 10000 } });
        } else if (rand < 0.08) {
          const randomItem = ITEMS[Math.floor(Math.random() * ITEMS.length)];
          row.push({ type: 'factory', content: { id: randomItem.id } });
        } else if (rand < 0.10) {
          const randomTrade = NPC_TRADES[Math.floor(Math.random() * NPC_TRADES.length)];
          row.push({ type: 'trader', content: randomTrade });
        } else {
          row.push({ type: 'empty' });
        }
      }
      newMap.push(row);
    }
    
    if (isRefresh) {
      setWorlds(prev => {
        const next = [...prev];
        next[currentWorldIndex] = { ...next[currentWorldIndex], map: newMap };
        return next;
      });
    }
    setGameMap(newMap);
  }, [currentWorldIndex]);

  useEffect(() => {
    if (isAuthReady) {
      const currentWorld = worlds[currentWorldIndex];
      if (currentWorld && currentWorld.map && currentWorld.map.length > 0) {
        // Only update gameMap if it's different from the world's map
        if (JSON.stringify(gameMap) !== JSON.stringify(currentWorld.map)) {
          setGameMap(currentWorld.map);
        }
      } else {
        generateMap();
      }
    }
  }, [isAuthReady, currentWorldIndex, generateMap]);

  // Sync gameMap to worlds when it changes
  useEffect(() => {
    if (gameMap.length > 0) {
      setWorlds(prev => {
        const next = [...prev];
        if (JSON.stringify(next[currentWorldIndex].map) !== JSON.stringify(gameMap)) {
          next[currentWorldIndex] = { ...next[currentWorldIndex], map: gameMap };
          return next;
        }
        return prev;
      });
    }
  }, [gameMap, currentWorldIndex]);

  const refreshMap = () => {
    if (balance >= MAP_REFRESH_COST) {
      setBalance(prev => prev - MAP_REFRESH_COST);
      generateMap(true);
      notify('Harita yenilendi!', 'success');
    } else {
      notify('Yetersiz bakiye!', 'error');
    }
  };

  const buyWorld = (index: number) => {
    const cost = WORLD_COSTS[index];
    if (balance >= cost) {
      setBalance(prev => prev - cost);
      setWorlds(prev => {
        const next = [...prev];
        next[index] = { ...next[index], isUnlocked: true };
        return next;
      });
      notify(`${worlds[index].name} kilidi açıldı!`, 'success');
    } else {
      notify('Yetersiz bakiye!', 'error');
    }
  };

  const switchWorld = (index: number) => {
    if (worlds[index].isUnlocked) {
      setCurrentWorldIndex(index);
      notify(`${worlds[index].name} dünyasına geçildi.`, 'info');
    } else {
      notify('Bu dünya henüz kilitli!', 'error');
    }
  };

  const buyBlock = (block: Block, multiplier: number = 1) => {
    if (multiplier <= 0) return;
    const totalCost = block.price * multiplier;
    if (balance >= totalCost) {
      setBalance(prev => prev - totalCost);
      setInventory(prev => ({
        ...prev,
        [block.id]: (prev[block.id] || 0) + multiplier
      }));
      notify(`${multiplier}x ${block.name} satın alındı!`, 'success');
      setBuyAmounts(prev => ({ ...prev, [block.id]: '' }));
    } else {
      notify('Yetersiz bakiye!', 'error');
    }
  };

  const sellBlock = (block: Block, multiplier: number = 1) => {
    if (multiplier <= 0) return;
    const currentAmount = inventory[block.id] || 0;
    if (currentAmount < multiplier) {
      notify('Yetersiz blok!', 'error');
      return;
    }
    const earnings = Math.floor(block.price * 0.5 * multiplier);
    setBalance(prev => prev + earnings);
    setInventory(prev => ({
      ...prev,
      [block.id]: prev[block.id] - multiplier
    }));
    notify(`${multiplier}x ${block.name} satıldı: +${earnings.toLocaleString()} TL`, 'success');
  };

  const handleTileClick = (x: number, y: number) => {
    if (!buildMode) return;

    const tile = gameMap[y][x];

    if (selectedBlockId) {
      // Place block
      if (tile.type === 'empty') {
        if ((inventory[selectedBlockId] || 0) > 0) {
          setInventory(prev => ({ ...prev, [selectedBlockId]: prev[selectedBlockId] - 1 }));
          setGameMap(prev => {
            const next = [...prev];
            next[y] = [...next[y]];
            next[y][x] = { type: 'block', blockId: selectedBlockId };
            return next;
          });
        } else {
          notify('Envanterinde bu bloktan yok!', 'error');
        }
      } else {
        notify('Burası dolu!', 'error');
      }
    } else {
      // Mine block
      if (tile.type === 'block' && tile.blockId) {
        const blockId = tile.blockId;
        setInventory(prev => ({ ...prev, [blockId]: (prev[blockId] || 0) + 1 }));
        setGameMap(prev => {
          const next = [...prev];
          next[y] = [...next[y]];
          next[y][x] = { type: 'empty' };
          return next;
        });
      }
    }
  };

  // --- AUTO-SAVE TO FIRESTORE ---
  const triggerSave = useCallback(() => {
    if (!user) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const saveData = {
          uid: user.uid,
          displayName: displayName,
          balance: balance,
          factories: factories,
          warehouse: warehouse,
          city: city,
          workers: workers,
          worlds: worlds.map(w => ({
            ...w,
            map: JSON.stringify(w.map) // Serialize nested array for Firestore
          })),
          currentWorldIndex: currentWorldIndex,
          inventory: inventory,
          currentRankId: currentRankId,
          lastDailyReward: lastDailyReward,
          lastUpdated: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), saveData, { merge: true });
      } catch (e) {
        console.error("Save error:", e);
      }
    }, 2000); // Debounce save
  }, [user, balance, factories, warehouse, city, workers, worlds, currentWorldIndex, inventory, currentRankId, lastDailyReward, displayName]);

  useEffect(() => {
    triggerSave();
  }, [balance, factories, warehouse, city, workers, worlds, currentWorldIndex, inventory, currentRankId, lastDailyReward, triggerSave]);

  const handleManualSave = async () => {
    if (!user) {
      notify('Kaydetmek için giriş yapmalısın!', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const saveData = {
        uid: user.uid,
        displayName: displayName,
        balance: balance,
        factories: factories,
        warehouse: warehouse,
        city: city,
        workers: workers,
        worlds: worlds.map(w => ({
          ...w,
          map: JSON.stringify(w.map) // Serialize nested array for Firestore
        })),
        currentWorldIndex: currentWorldIndex,
        inventory: inventory,
        currentRankId: currentRankId,
        lastDailyReward: lastDailyReward,
        lastUpdated: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', user.uid), saveData, { merge: true });
      notify('Oyun başarıyla kaydedildi!', 'success');
    } catch (e) {
      notify('Kaydetme hatası!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- PRODUCTION & EVENT & RAID LOOP ---
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Production
      setWarehouse(prev => {
        const next = { ...prev };
        let produced = false;
        Object.entries(factories).forEach(([id, count]) => {
          const factoryCount = Number(count) || 0;
          if (factoryCount > 0) {
            let multiplier = 1;
            
            // Event Multiplier
            if (activeEvent?.id === 'coal_rush' && id === 'komur') {
              multiplier *= 2;
            }

            // City Bonuses
            if (city['granary'] && (id === 'bugday' || id === 'kavun' || id === 'kabak')) {
              multiplier *= 1.15;
            }

            // Worker Multipliers
            WORKERS.forEach(worker => {
              if (workers[worker.id]) {
                multiplier *= Math.pow(worker.multiplier, workers[worker.id]);
              }
            });

            next[id] = (Number(next[id]) || 0) + Math.floor(factoryCount * multiplier);
            produced = true;
          }
        });
        return produced ? next : prev;
      });

      // 2. Event Timer
      if (activeEvent && Date.now() > activeEvent.endTime) {
        setActiveEvent(null);
        notify('Etkinlik sona erdi!', 'info');
      }

      // 3. Random Event Trigger
      if (!activeEvent && Math.random() < 0.005) { // 0.5% chance per second
        // Trigger based on conditions
        if (factories['komur'] >= 10 && Math.random() < 0.5) {
          const event = GAME_EVENTS.find(e => e.id === 'coal_rush');
          if (event) {
            setActiveEvent({ id: event.id, endTime: Date.now() + event.duration * 1000 });
            notify(`ETKİNLİK: ${event.name} başladı!`, 'info');
          }
        } else if (balance > 1000000 && Math.random() < 0.3) {
          const event = GAME_EVENTS.find(e => e.id === 'village_festival');
          if (event) {
            setBalance(prev => prev + event.rewardValue);
            notify(`ETKİNLİK: ${event.name}! +${event.rewardValue.toLocaleString()} TL kazandın!`, 'success');
          }
        }
      }

      // 4. Raid Logic
      if (Math.random() < 0.001) { // 0.1% chance per second
        handleRaid();
      }

    }, 1000);
    return () => clearInterval(interval);
  }, [factories, activeEvent, city, balance]);

  const handleRaid = () => {
    const hasBarracks = city['barracks'] > 0;
    const watchtowerCount = city['watchtower'] || 0;
    
    // Chance to repel if barracks exist
    if (hasBarracks && Math.random() < 0.5) {
      notify('BASKIN! Kışla askerleri saldırıyı savuşturdu!', 'success');
      return;
    }

    notify('BASKIN! Vadi saldırı altında!', 'error');
    
    // Calculate loss
    let lossMultiplier = 0.2; // 20% loss base
    lossMultiplier -= (watchtowerCount * 0.05); // Each tower reduces loss by 5%
    if (lossMultiplier < 0.05) lossMultiplier = 0.05;

    const lostMoney = Math.floor(balance * lossMultiplier);
    setBalance(prev => Math.max(0, prev - lostMoney));
    notify(`Baskın sonucu ${lostMoney.toLocaleString()} TL kaybettin!`, 'error');
  };

  const buyStructure = (structure: CityStructure) => {
    if (balance >= structure.cost) {
      setBalance(prev => prev - structure.cost);
      setCity(prev => ({
        ...prev,
        [structure.id]: (prev[structure.id] || 0) + 1
      }));
      notify(`${structure.name} inşa edildi!`, 'success');
    } else {
      notify('Yetersiz bakiye!', 'error');
    }
  };

  const buyWorker = (worker: Worker) => {
    if (balance >= worker.cost) {
      setBalance(prev => prev - worker.cost);
      setWorkers(prev => ({
        ...prev,
        [worker.id]: (prev[worker.id] || 0) + 1
      }));
      notify(`${worker.name} işe alındı!`, 'success');
    } else {
      notify('Yetersiz bakiye!', 'error');
    }
  };

  const movePlayer = (dx: number, dy: number) => {
    const newX = Math.max(0, Math.min(14, mapPosition.x + dx));
    const newY = Math.max(0, Math.min(14, mapPosition.y + dy));
    
    if (newX !== mapPosition.x || newY !== mapPosition.y) {
      setMapPosition({ x: newX, y: newY });
      
      const tile = gameMap[newY][newX];
      if (tile.type !== 'empty') {
        handleEncounter(tile, newX, newY);
      }
    }
  };

  const handleEncounter = (tile: MapTile, x: number, y: number) => {
    if (tile.type === 'valley') {
      setBalance(prev => prev + tile.content.bonus);
      notify(`Gizli bir vadi buldun! ${formatMoney(tile.content.bonus)} kazandın.`, 'success');
    } else if (tile.type === 'factory') {
      setFactories(prev => ({
        ...prev,
        [tile.content.id]: (prev[tile.content.id] || 0) + 1
      }));
      notify(`Terk edilmiş bir fabrika buldun!`, 'success');
    } else if (tile.type === 'trader') {
      notify(`Bir tüccarla karşılaştın: ${tile.content.npcName}`, 'info');
      // In a real app, we might open the NPC tab or a special modal
    }

    // Clear tile after encounter
    setGameMap(prev => {
      const next = [...prev];
      next[y] = [...next[y]];
      next[y][x] = { type: 'empty' };
      return next;
    });
  };

  // --- ACTIONS ---
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      notify('Giriş başarılı!', 'success');
    } catch (e) {
      notify('Giriş başarısız!', 'error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setBalance(100000);
    setFactories({});
    setWarehouse({});
    notify('Çıkış yapıldı.', 'success');
  };

  const buyFactory = (item: ItemData, amount: number = 1) => {
    const totalCost = item.factoryPrice * amount;
    if (amount <= 0) return;
    
    if (balance >= totalCost) {
      setBalance(prev => prev - totalCost);
      setFactories(prev => ({
        ...prev,
        [item.id]: (prev[item.id] || 0) + amount
      }));
      notify(`${amount}x ${item.name} Fabrikası kuruldu!`, 'success');
      // Clear input after purchase
      setBuyAmounts(prev => ({ ...prev, [item.id]: '' }));
    } else {
      notify('Yetersiz bakiye!', 'error');
    }
  };

  const sellResource = (item: ItemData, amount: number) => {
    const currentAmount = warehouse[item.id] || 0;
    if (currentAmount >= amount) {
      const currentRank = RANKS.find(r => r.id === currentRankId);
      let multiplier = currentRank ? currentRank.moneyMultiplier : 1;
      
      // Event Multiplier
      if (activeEvent?.id === 'golden_harvest') {
        multiplier *= 1.5;
      }

      // City Bonus
      if (city['bank']) {
        multiplier *= 1.1;
      }

      const earnings = Math.floor(amount * item.sellPrice * multiplier);
      
      setBalance(prev => prev + earnings);
      setWarehouse(prev => ({
        ...prev,
        [item.id]: prev[item.id] - amount
      }));
      notify(`${amount} adet ${item.name} satıldı: +${earnings.toLocaleString()} TL`, 'success');
    }
  };

  const sellAll = () => {
    const currentRank = RANKS.find(r => r.id === currentRankId);
    let multiplier = currentRank ? currentRank.moneyMultiplier : 1;
    
    // Event Multiplier
    if (activeEvent?.id === 'golden_harvest') {
      multiplier *= 1.5;
    }

    // City Bonus
    if (city['bank']) {
      multiplier *= 1.1;
    }

    let totalEarnings = 0;
    const nextWarehouse = { ...warehouse };
    
    ITEMS.forEach(item => {
      const amount = nextWarehouse[item.id] || 0;
      if (amount > 0) {
        totalEarnings += Math.floor(amount * item.sellPrice * multiplier);
        nextWarehouse[item.id] = 0;
      }
    });
    if (totalEarnings > 0) {
      setBalance(prev => prev + totalEarnings);
      setWarehouse(nextWarehouse);
      notify(`Tüm depo satıldı: +${totalEarnings.toLocaleString()} TL`, 'success');
    } else {
      notify('Depo zaten boş!', 'error');
    }
  };

  const handleTrade = (trade: NPCTrade, multiplier: number = 1) => {
    if (multiplier <= 0) return;
    const totalInput = trade.inputAmount * multiplier;
    const currentInputAmount = warehouse[trade.inputItemId] || 0;
    
    if (currentInputAmount < totalInput) {
      notify('Yetersiz malzeme!', 'error');
      return;
    }

    // Process trade
    setWarehouse(prev => ({
      ...prev,
      [trade.inputItemId]: prev[trade.inputItemId] - totalInput
    }));

    const totalOutput = trade.outputAmount * multiplier;

    if (trade.outputType === 'money') {
      setBalance(prev => prev + totalOutput);
    } else if (trade.outputType === 'factory') {
      setFactories(prev => ({
        ...prev,
        [trade.outputTargetId]: (prev[trade.outputTargetId] || 0) + totalOutput
      }));
    } else if (trade.outputType === 'item') {
      setWarehouse(prev => ({
        ...prev,
        [trade.outputTargetId]: (prev[trade.outputTargetId] || 0) + totalOutput
      }));
    } else if (trade.outputType === 'block') {
      setInventory(prev => ({
        ...prev,
        [trade.outputTargetId]: (prev[trade.outputTargetId] || 0) + totalOutput
      }));
    }

    notify(`${multiplier}x takas başarılı!`, 'success');
    setTradeAmounts(prev => ({ ...prev, [trade.id]: '' }));
  };

  const sendGift = async (recipientUid: string, recipientName: string) => {
    if (!user) {
      notify('Hediye göndermek için giriş yapmalısın!', 'error');
      return;
    }

    const amountStr = window.prompt(`${recipientName} kullanıcısına ne kadar TL göndermek istersin?`);
    if (!amountStr) return;
    
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      notify('Geçersiz miktar!', 'error');
      return;
    }

    if (balance < amount) {
      notify('Yetersiz bakiye!', 'error');
      return;
    }

    try {
      const recipientRef = doc(db, 'users', recipientUid);
      const recipientDoc = await getDoc(recipientRef);
      
      if (recipientDoc.exists()) {
        const recipientData = recipientDoc.data();
        const newRecipientBalance = (recipientData.balance || 0) + amount;
        
        // Update recipient
        await setDoc(recipientRef, { balance: newRecipientBalance }, { merge: true });
        
        // Deduct from sender
        setBalance(prev => prev - amount);
        
        notify(`${recipientName} kullanıcısına ${amount.toLocaleString()} TL gönderildi!`, 'success');
      } else {
        notify('Kullanıcı bulunamadı!', 'error');
      }
    } catch (e) {
      console.error("Gift error:", e);
      notify('Hediye gönderilirken hata oluştu!', 'error');
    }
  };

  const handleUpgradeRank = (rank: Rank) => {
    // Check if user already has this rank or higher
    const currentRank = RANKS.find(r => r.id === currentRankId);
    if (currentRank && currentRank.level >= rank.level) {
      notify('Zaten bu rütbeye veya daha üstüne sahipsin!', 'error');
      return;
    }

    // Check costs
    for (const [factoryId, amount] of Object.entries(rank.costFactories)) {
      if ((factories[factoryId] || 0) < amount) {
        const factory = ITEMS.find(i => i.id === factoryId);
        notify(`Yetersiz fabrika: ${amount}x ${factory?.name} gerekli!`, 'error');
        return;
      }
    }

    // Deduct factories
    const nextFactories = { ...factories };
    for (const [factoryId, amount] of Object.entries(rank.costFactories)) {
      nextFactories[factoryId] -= amount;
    }

    setFactories(nextFactories);
    setCurrentRankId(rank.id);
    notify(`${rank.name} rütbesine yükseldin!`, 'success');
  };

  const handleClaimDailyReward = () => {
    if (!currentRankId) {
      notify('Günlük ödül için en az Bronz rütbe olmalısın!', 'error');
      return;
    }

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - lastDailyReward < oneDay) {
      const remaining = oneDay - (now - lastDailyReward);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      notify(`Ödül için ${hours}s ${minutes}dk beklemelisin!`, 'error');
      return;
    }

    const rank = RANKS.find(r => r.id === currentRankId);
    if (rank) {
      setBalance(prev => prev + rank.dailyReward);
      setLastDailyReward(now);
      notify(`Günlük ödül alındı: +${rank.dailyReward.toLocaleString()} TL`, 'success');
    }
  };

  const formatMoney = (val: number) => val.toLocaleString('tr-TR') + ' TL';

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="animate-bounce flex flex-col items-center gap-4">
          <Factory className="w-12 h-12 text-[#5a5a40]" />
          <p className="font-serif text-xl font-bold text-[#5a5a40]">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      {/* Navbar */}
      <header className="bg-[#5a5a40] text-[#f5f5f0] px-6 py-4 flex items-center justify-between shadow-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f5f5f0] rounded-lg flex items-center justify-center">
            <Factory className="text-[#5a5a40] w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight hidden sm:block">KANGALF VADİSİ</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#4a4a30] px-4 py-2 rounded-full flex items-center gap-2 border border-white/10">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="font-mono font-bold text-lg">{formatMoney(balance)}</span>
          </div>

          <button 
            onClick={handleManualSave}
            disabled={isSaving}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors relative group"
            title="Manuel Kaydet"
          >
            <Save className={`w-5 h-5 ${isSaving ? 'animate-spin' : ''}`} />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Kaydet
            </span>
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs opacity-70">Hoş geldin,</span>
                <span className="font-bold">{displayName}</span>
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="flex items-center gap-2 bg-[#f5f5f0] text-[#5a5a40] px-4 py-2 rounded-lg font-bold hover:bg-white transition-all">
              <LogIn className="w-5 h-5" />
              Giriş Yap
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 space-y-4">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {[
              { id: 'market', icon: ShoppingCart, label: 'Market' },
              { id: 'warehouse', icon: Package, label: 'Depo' },
              { id: 'npc', icon: Repeat, label: 'NPC Takas' },
              { id: 'ranks', icon: Award, label: 'Rütbe' },
              { id: 'city', icon: Home, label: 'Şehir' },
              { id: 'workers', icon: Users, label: 'İşçiler' },
              { id: 'marketblok', icon: Box, label: 'MarketBlok' },
              { id: 'map', icon: MapIcon, label: 'Harita' },
              { id: 'leaderboard', icon: Trophy, label: 'Sıralama' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-6 py-4 rounded-xl font-bold transition-all whitespace-nowrap flex-1 lg:flex-none ${
                  activeTab === tab.id 
                  ? 'bg-[#5a5a40] text-[#f5f5f0] shadow-lg scale-[1.02]' 
                  : 'bg-white text-[#5a5a40] hover:bg-[#e5e5d0]'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="stardew-card p-6 space-y-4 hidden lg:block">
            <h3 className="font-serif text-xl font-bold border-b-2 border-[#5a5a40] pb-2">Üretim Durumu</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {ITEMS.filter(i => (Number(factories[i.id]) || 0) > 0).map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-mono text-[#5a5a40] font-bold">+{factories[item.id]}/sn</span>
                </div>
              ))}
              {!Object.values(factories).some(v => (Number(v) || 0) > 0) && (
                <p className="text-sm italic opacity-60 text-center py-4">Henüz fabrika yok.</p>
              )}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            {activeTab === 'market' && (
              <motion.div 
                key="market"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {['Maden', 'Tarım', 'Mob', 'Özel'].map(cat => (
                  <section key={cat} className="space-y-4">
                    <h2 className="font-serif text-2xl font-bold text-[#5a5a40] flex items-center gap-2">
                      <div className="w-2 h-8 bg-[#5a5a40] rounded-full" />
                      {cat} Fabrikaları
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {ITEMS.filter(i => i.category === cat).map(item => (
                        <div key={item.id} className="stardew-card p-5 group flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center border-2 border-[#5a5a40] shadow-md`}>
                              <item.icon className="w-8 h-8 text-white/90" />
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold opacity-60">Fabrika</span>
                              <div className="text-2xl font-mono font-bold">{factories[item.id] || 0}</div>
                            </div>
                          </div>
                          <h3 className="font-serif text-xl font-bold mb-1">{item.name}</h3>
                          <p className="text-xs opacity-70 mb-4 flex-grow">Saniyede 1 adet {item.name.toLowerCase()} üretir.</p>
                          <button 
                            onClick={() => buyFactory(item)}
                            className={`w-full py-3 rounded-lg font-bold transition-all border-2 border-[#5a5a40] ${
                              balance >= item.factoryPrice 
                              ? 'bg-[#5a5a40] text-white hover:bg-[#7a7a60]' 
                              : 'bg-white text-[#5a5a40] opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {formatMoney(item.factoryPrice)}
                          </button>

                          {/* Shortcut Purchase */}
                          {(() => {
                            const maxBuyable = Math.floor(balance / item.factoryPrice);
                            return (
                              <div className="mt-4 pt-4 border-t border-[#5a5a40]/10 space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold opacity-60 uppercase">
                                  <span>Maksimum Alınabilir</span>
                                  <span className="font-mono">{maxBuyable.toLocaleString()} Adet</span>
                                </div>
                                <div className="flex gap-2">
                                  <input 
                                    type="number"
                                    placeholder="Miktar"
                                    value={buyAmounts[item.id] || ''}
                                    onChange={(e) => setBuyAmounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    className="flex-1 bg-[#f5f5f0] border-2 border-[#5a5a40]/20 rounded-lg px-3 py-2 text-sm font-mono focus:border-[#5a5a40] outline-none transition-all"
                                    min="1"
                                    max={maxBuyable}
                                  />
                                  <button 
                                    onClick={() => buyFactory(item, parseInt(buyAmounts[item.id] || '0'))}
                                    disabled={!buyAmounts[item.id] || parseInt(buyAmounts[item.id]) <= 0 || parseInt(buyAmounts[item.id]) > maxBuyable}
                                    className="bg-[#5a5a40] text-white p-2 rounded-lg hover:bg-[#7a7a60] disabled:opacity-30 transition-all flex items-center justify-center"
                                  >
                                    <Check className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </motion.div>
            )}

            {activeTab === 'warehouse' && (
              <motion.div 
                key="warehouse"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="stardew-card p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h2 className="font-serif text-3xl font-bold">Ambar</h2>
                    <p className="opacity-70">Ürettiğin tüm ürünleri buradan satabilirsin.</p>
                  </div>
                  <button 
                    onClick={sellAll}
                    className="stardew-button px-10 py-4 text-xl shadow-lg flex items-center gap-3"
                  >
                    <ShoppingCart className="w-6 h-6" />
                    Tümünü Sat
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ITEMS.map(item => {
                    const amount = warehouse[item.id] || 0;
                    if (amount === 0 && (factories[item.id] || 0) === 0) return null;
                    return (
                      <div key={item.id} className="stardew-card p-5 flex items-center gap-4">
                        <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center border-2 border-[#5a5a40] shrink-0`}>
                          <item.icon className="w-8 h-8 text-white/90" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate">{item.name}</h3>
                          <div className="text-2xl font-mono font-bold text-[#5a5a40]">{amount.toLocaleString()}</div>
                          <p className="text-[10px] opacity-60">Birim: {item.sellPrice} TL</p>
                        </div>
                        <button 
                          onClick={() => sellResource(item, amount)}
                          disabled={amount === 0}
                          className="p-3 bg-[#e5e5d0] hover:bg-[#d5d5c0] rounded-lg disabled:opacity-30 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'npc' && (
              <motion.div 
                key="npc"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="stardew-card p-8 bg-[#5a5a40] text-[#f5f5f0]">
                  <h2 className="font-serif text-3xl font-bold flex items-center gap-3">
                    <MessageSquare className="w-8 h-8" />
                    Vadi Sakinleri ile Takas
                  </h2>
                  <p className="opacity-80">Köylüler bazen ellerindeki değerli eşyaları veya fabrikaları senin kaynaklarınla takas etmek isterler.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {NPC_TRADES.map(trade => {
                    const inputItem = ITEMS.find(i => i.id === trade.inputItemId);
                    const outputItem = trade.outputType === 'item' ? ITEMS.find(i => i.id === trade.outputTargetId) : null;
                    const outputFactory = trade.outputType === 'factory' ? ITEMS.find(i => i.id === trade.outputTargetId) : null;
                    const userHasEnough = (warehouse[trade.inputItemId] || 0) >= trade.inputAmount;

                    return (
                      <div key={trade.id} className="stardew-card p-6 space-y-4 relative overflow-hidden group">
                        <div className="flex items-center gap-4 border-b-2 border-[#5a5a40]/10 pb-4">
                          <div className="text-4xl bg-[#e5e5d0] w-16 h-16 rounded-full flex items-center justify-center shadow-inner">
                            {trade.npcAvatar}
                          </div>
                          <div>
                            <h3 className="font-serif text-xl font-bold">{trade.npcName}</h3>
                            <p className="text-xs opacity-60 uppercase font-bold tracking-wider">{trade.npcRole}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-[#f5f5f0] p-4 rounded-xl border-2 border-dashed border-[#5a5a40]/20">
                          <div className="text-center flex-1">
                            <p className="text-[10px] font-bold opacity-50 uppercase mb-1">Verilecek</p>
                            <div className="font-bold text-lg text-red-600">
                              {trade.inputAmount} {inputItem?.name}
                            </div>
                          </div>
                          <Repeat className="w-6 h-6 text-[#5a5a40]/30" />
                          <div className="text-center flex-1">
                            <p className="text-[10px] font-bold opacity-50 uppercase mb-1">Alınacak</p>
                            <div className="font-bold text-lg text-green-600">
                              {trade.outputAmount} {trade.outputType === 'money' ? 'TL' : (outputItem?.name || outputFactory?.name + ' Fabrikası')}
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleTrade(trade)}
                          disabled={!userHasEnough}
                          className={`w-full py-4 rounded-xl font-bold transition-all border-2 border-[#5a5a40] ${
                            userHasEnough 
                            ? 'bg-[#5a5a40] text-white hover:bg-[#7a7a60] shadow-md' 
                            : 'bg-white text-[#5a5a40] opacity-50 cursor-not-allowed'
                          }`}
                        >
                          {userHasEnough ? 'Takas Yap' : 'Yetersiz Malzeme'}
                        </button>

                        {/* Shortcut Trade */}
                        {(() => {
                          const maxTradable = Math.floor((warehouse[trade.inputItemId] || 0) / trade.inputAmount);
                          return (
                            <div className="pt-4 border-t border-[#5a5a40]/10 space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold opacity-60 uppercase">
                                <span>Maksimum Takas</span>
                                <span className="font-mono">{maxTradable.toLocaleString()} Kez</span>
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  type="number"
                                  placeholder="Miktar"
                                  value={tradeAmounts[trade.id] || ''}
                                  onChange={(e) => setTradeAmounts(prev => ({ ...prev, [trade.id]: e.target.value }))}
                                  className="flex-1 bg-[#f5f5f0] border-2 border-[#5a5a40]/20 rounded-lg px-3 py-2 text-sm font-mono focus:border-[#5a5a40] outline-none transition-all"
                                  min="1"
                                  max={maxTradable}
                                />
                                <button 
                                  onClick={() => handleTrade(trade, parseInt(tradeAmounts[trade.id] || '0'))}
                                  disabled={!tradeAmounts[trade.id] || parseInt(tradeAmounts[trade.id]) <= 0 || parseInt(tradeAmounts[trade.id]) > maxTradable}
                                  className="bg-[#5a5a40] text-white p-2 rounded-lg hover:bg-[#7a7a60] disabled:opacity-30 transition-all flex items-center justify-center"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'ranks' && (
              <motion.div 
                key="ranks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="stardew-card p-8 bg-gradient-to-r from-[#5a5a40] to-[#7a7a60] text-white">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                      <h2 className="font-serif text-4xl font-bold mb-2">Rütbe ve Prestij</h2>
                      <p className="opacity-80">Fabrikalarını feda ederek rütbe atla, kalıcı bonuslar kazan!</p>
                    </div>
                    <div className="text-center bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                      <p className="text-xs uppercase font-bold opacity-60 mb-1">Mevcut Rütben</p>
                      <div className={`text-2xl font-bold ${RANKS.find(r => r.id === currentRankId)?.color || 'text-white'}`}>
                        {RANKS.find(r => r.id === currentRankId)?.name || 'Halktan Biri'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Reward Section */}
                <div className="stardew-card p-6 border-dashed border-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#f5f5f0]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                      <Calendar className="text-white w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Günlük Rütbe Ödülü</h3>
                      <p className="text-sm opacity-60">Rütbene göre her 24 saatte bir nakit alabilirsin.</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleClaimDailyReward}
                    className="stardew-button px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Ödülü Al
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {RANKS.map(rank => {
                    const isCurrent = currentRankId === rank.id;
                    const isUnlocked = RANKS.find(r => r.id === currentRankId)?.level! >= rank.level;
                    
                    return (
                      <div key={rank.id} className={`stardew-card p-6 flex flex-col justify-between ${isCurrent ? 'ring-4 ring-[#5a5a40] ring-offset-4' : ''}`}>
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className={`font-serif text-2xl font-bold ${rank.color}`}>{rank.name}</h3>
                              <p className="text-sm opacity-70 italic">{rank.description}</p>
                            </div>
                            <div className="bg-[#5a5a40] text-white px-3 py-1 rounded-full text-xs font-bold">
                              Seviye {rank.level}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-[#f5f5f0] p-3 rounded-xl border-2 border-[#5a5a40]/10">
                              <p className="text-[10px] font-bold opacity-50 uppercase">Satış Bonusu</p>
                              <p className="text-xl font-bold text-green-600">+{Math.round((rank.moneyMultiplier - 1) * 100)}%</p>
                            </div>
                            <div className="bg-[#f5f5f0] p-3 rounded-xl border-2 border-[#5a5a40]/10">
                              <p className="text-[10px] font-bold opacity-50 uppercase">Günlük Ödül</p>
                              <p className="text-xl font-bold text-blue-600">{rank.dailyReward.toLocaleString()} TL</p>
                            </div>
                          </div>

                          <div className="mb-6">
                            <p className="text-xs font-bold opacity-50 uppercase mb-2">Gereken Fabrikalar</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(rank.costFactories).map(([fid, amt]) => {
                                const item = ITEMS.find(i => i.id === fid);
                                const hasEnough = (factories[fid] || 0) >= amt;
                                return (
                                  <div key={fid} className={`px-3 py-1 rounded-lg text-xs font-bold border-2 flex items-center gap-2 ${
                                    hasEnough ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'
                                  }`}>
                                    {amt}x {item?.name}
                                    {hasEnough && <Zap className="w-3 h-3" />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleUpgradeRank(rank)}
                          disabled={isUnlocked}
                          className={`w-full py-4 rounded-xl font-bold transition-all border-2 border-[#5a5a40] ${
                            isUnlocked 
                            ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed' 
                            : 'bg-[#5a5a40] text-white hover:bg-[#7a7a60] shadow-md'
                          }`}
                        >
                          {isCurrent ? 'Mevcut Rütbe' : isUnlocked ? 'Açıldı' : 'Rütbe Atla'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'city' && (
              <motion.div 
                key="city"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="stardew-card p-8 bg-[#5a5a40] text-[#f5f5f0] flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="font-serif text-3xl font-bold flex items-center gap-3">
                      <Home className="w-8 h-8" />
                      Vadi Şehri
                    </h2>
                    <p className="opacity-80">Şehrini geliştirerek baskınlara karşı savunma kur ve özel bonuslar kazan.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-white/10 p-4 rounded-xl text-center border border-white/20">
                      <Shield className="w-6 h-6 mx-auto mb-1 text-blue-300" />
                      <p className="text-[10px] uppercase font-bold opacity-60">Savunma</p>
                      <p className="text-xl font-bold">%{Math.min(100, (city['watchtower'] || 0) * 20 + (city['barracks'] || 0) * 50)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {CITY_STRUCTURES.map(structure => (
                    <div key={structure.id} className="stardew-card p-6 flex flex-col justify-between group">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-16 h-16 bg-[#e5e5d0] rounded-2xl flex items-center justify-center border-2 border-[#5a5a40] shadow-inner">
                            <structure.icon className="w-8 h-8 text-[#5a5a40]" />
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold opacity-60">İnşa Edildi</span>
                            <div className="text-2xl font-mono font-bold">{city[structure.id] || 0}</div>
                          </div>
                        </div>
                        <h3 className="font-serif text-2xl font-bold mb-1">{structure.name}</h3>
                        <p className="text-sm opacity-70 mb-2">{structure.description}</p>
                        <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs font-bold mb-6 border border-green-200">
                          BONUS: {structure.bonus}
                        </div>
                      </div>
                      <button 
                        onClick={() => buyStructure(structure)}
                        className={`w-full py-4 rounded-xl font-bold transition-all border-2 border-[#5a5a40] ${
                          balance >= structure.cost 
                          ? 'bg-[#5a5a40] text-white hover:bg-[#7a7a60]' 
                          : 'bg-white text-[#5a5a40] opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {formatMoney(structure.cost)}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'workers' && (
              <motion.div 
                key="workers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="stardew-card p-8 bg-[#5a5a40] text-[#f5f5f0] flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="font-serif text-3xl font-bold flex items-center gap-3">
                      <Users className="w-8 h-8" />
                      İşçi Pazarı
                    </h2>
                    <p className="opacity-80">Otomatik işçiler tutarak vadi üretimini katla. Her işçi tüm fabrikaların verimini artırır.</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl text-center border border-white/20">
                    <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-300" />
                    <p className="text-[10px] uppercase font-bold opacity-60">Toplam Bonus</p>
                    <p className="text-xl font-bold">
                      x{WORKERS.reduce((acc, w) => acc * Math.pow(w.multiplier, workers[w.id] || 0), 1).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {WORKERS.map(worker => (
                    <div key={worker.id} className="stardew-card p-6 flex flex-col justify-between group">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-16 h-16 bg-[#e5e5d0] rounded-2xl flex items-center justify-center border-2 border-[#5a5a40] shadow-inner">
                            <worker.icon className="w-8 h-8 text-[#5a5a40]" />
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold opacity-60">İşe Alındı</span>
                            <div className="text-2xl font-mono font-bold">{workers[worker.id] || 0}</div>
                          </div>
                        </div>
                        <h3 className="font-serif text-2xl font-bold mb-1">{worker.name}</h3>
                        <p className="text-sm opacity-70 mb-2">{worker.description}</p>
                        <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-bold mb-6 border border-blue-200">
                          BONUS: x{worker.multiplier} (Katlanarak artar)
                        </div>
                      </div>
                      <button 
                        onClick={() => buyWorker(worker)}
                        className={`w-full py-4 rounded-xl font-bold transition-all border-2 border-[#5a5a40] ${
                          balance >= worker.cost 
                          ? 'bg-[#5a5a40] text-white hover:bg-[#7a7a60]' 
                          : 'bg-white text-[#5a5a40] opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {formatMoney(worker.cost)}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'marketblok' && (
              <motion.div 
                key="marketblok"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="stardew-card p-8 bg-[#5a5a40] text-[#f5f5f0] flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="font-serif text-3xl font-bold flex items-center gap-3">
                      <Box className="w-8 h-8" />
                      MarketBlok
                    </h2>
                    <p className="opacity-80">Dünyanı inşa etmek için bloklar satın al veya takas et. Her blok farklı bir estetik ve dayanıklılık sunar.</p>
                  </div>
                </div>

                {/* Blok Marketi Section */}
                <section className="space-y-4">
                  <h2 className="font-serif text-2xl font-bold text-[#5a5a40] flex items-center gap-2">
                    <div className="w-2 h-8 bg-[#5a5a40] rounded-full" />
                    Blok Marketi
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {BLOCKS.map(block => (
                      <div key={block.id} className="stardew-card p-5 group flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`w-14 h-14 ${block.color} rounded-xl flex items-center justify-center border-2 border-[#5a5a40] shadow-md`}>
                            <block.icon className="w-8 h-8 text-white/90" />
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold opacity-60">Envanter</span>
                            <div className="text-2xl font-mono font-bold">{inventory[block.id] || 0}</div>
                          </div>
                        </div>
                        <h3 className="font-serif text-xl font-bold mb-1">{block.name}</h3>
                        <p className="text-xs opacity-70 mb-4 flex-grow">Haritaya yerleştirilebilir dekoratif blok.</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => buyBlock(block)}
                            className={`py-3 rounded-lg font-bold transition-all border-2 border-[#5a5a40] ${
                              balance >= block.price 
                              ? 'bg-[#5a5a40] text-white hover:bg-[#7a7a60]' 
                              : 'bg-white text-[#5a5a40] opacity-50 cursor-not-allowed'
                            }`}
                          >
                            Al: {formatMoney(block.price)}
                          </button>
                          <button 
                            onClick={() => sellBlock(block)}
                            className={`py-3 rounded-lg font-bold transition-all border-2 border-[#5a5a40] ${
                              (inventory[block.id] || 0) > 0 
                              ? 'bg-white text-[#5a5a40] hover:bg-[#f5f5f0]' 
                              : 'bg-white text-[#5a5a40] opacity-50 cursor-not-allowed'
                            }`}
                          >
                            Sat: {formatMoney(Math.floor(block.price * 0.5))}
                          </button>
                        </div>

                        {/* Shortcut Purchase/Sell */}
                        {(() => {
                          const maxBuyable = Math.floor(balance / block.price);
                          const currentAmount = inventory[block.id] || 0;
                          const amount = parseInt(buyAmounts[block.id] || '0');
                          
                          return (
                            <div className="mt-4 pt-4 border-t border-[#5a5a40]/10 space-y-2">
                              <div className="flex justify-between items-center text-[10px] font-bold opacity-60 uppercase">
                                <span>Maks: Al {maxBuyable.toLocaleString()} | Sat {currentAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  type="number"
                                  placeholder="Miktar"
                                  value={buyAmounts[block.id] || ''}
                                  onChange={(e) => setBuyAmounts(prev => ({ ...prev, [block.id]: e.target.value }))}
                                  className="flex-1 bg-[#f5f5f0] border-2 border-[#5a5a40]/20 rounded-lg px-3 py-2 text-sm font-mono focus:border-[#5a5a40] outline-none transition-all"
                                  min="1"
                                />
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => buyBlock(block, amount)}
                                    disabled={amount <= 0 || amount > maxBuyable}
                                    title="Toplu Al"
                                    className="bg-[#5a5a40] text-white p-2 rounded-lg hover:bg-[#7a7a60] disabled:opacity-30 transition-all flex items-center justify-center"
                                  >
                                    <ShoppingCart className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => sellBlock(block, amount)}
                                    disabled={amount <= 0 || amount > currentAmount}
                                    title="Toplu Sat"
                                    className="bg-white text-[#5a5a40] border-2 border-[#5a5a40] p-2 rounded-lg hover:bg-[#f5f5f0] disabled:opacity-30 transition-all flex items-center justify-center"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Blok Takası Section */}
                <section className="space-y-4">
                  <h2 className="font-serif text-2xl font-bold text-[#5a5a40] flex items-center gap-2">
                    <div className="w-2 h-8 bg-[#5a5a40] rounded-full" />
                    Blok Takası
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {NPC_TRADES.filter(t => t.outputType === 'block').map(trade => {
                      const inputItem = ITEMS.find(i => i.id === trade.inputItemId);
                      const outputBlock = BLOCKS.find(b => b.id === trade.outputTargetId);
                      const userHasEnough = (warehouse[trade.inputItemId] || 0) >= trade.inputAmount;

                      return (
                        <div key={trade.id} className="stardew-card p-6 flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-[#f5f5f0] rounded-full border-4 border-[#5a5a40] flex items-center justify-center text-3xl shadow-inner">
                              {trade.npcAvatar}
                            </div>
                            <div>
                              <h3 className="font-serif text-xl font-bold">{trade.npcName}</h3>
                              <p className="text-xs font-bold text-[#5a5a40]/60 uppercase tracking-wider">{trade.npcRole}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between bg-[#f5f5f0] p-4 rounded-xl border-2 border-dashed border-[#5a5a40]/20">
                            <div className="text-center flex-1">
                              <p className="text-[10px] font-bold opacity-50 uppercase mb-1">Verilecek</p>
                              <div className="font-bold text-lg text-red-600">
                                {trade.inputAmount} {inputItem?.name}
                              </div>
                            </div>
                            <Repeat className="w-6 h-6 text-[#5a5a40]/30" />
                            <div className="text-center flex-1">
                              <p className="text-[10px] font-bold opacity-50 uppercase mb-1">Alınacak</p>
                              <div className="font-bold text-lg text-green-600">
                                {trade.outputAmount} {outputBlock?.name}
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleTrade(trade)}
                            disabled={!userHasEnough}
                            className={`w-full py-4 rounded-xl font-bold transition-all border-2 border-[#5a5a40] ${
                              userHasEnough 
                              ? 'bg-[#5a5a40] text-white hover:bg-[#7a7a60] shadow-md' 
                              : 'bg-white text-[#5a5a40] opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {userHasEnough ? 'Takas Yap' : 'Yetersiz Malzeme'}
                          </button>

                          {/* Shortcut Trade */}
                          {(() => {
                            const maxTradable = Math.floor((warehouse[trade.inputItemId] || 0) / trade.inputAmount);
                            return (
                              <div className="pt-4 border-t border-[#5a5a40]/10 space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold opacity-60 uppercase">
                                  <span>Maksimum Takas</span>
                                  <span className="font-mono">{maxTradable.toLocaleString()} Kez</span>
                                </div>
                                <div className="flex gap-2">
                                  <input 
                                    type="number"
                                    placeholder="Miktar"
                                    value={tradeAmounts[trade.id] || ''}
                                    onChange={(e) => setTradeAmounts(prev => ({ ...prev, [trade.id]: e.target.value }))}
                                    className="flex-1 bg-[#f5f5f0] border-2 border-[#5a5a40]/20 rounded-lg px-3 py-2 text-sm font-mono focus:border-[#5a5a40] outline-none transition-all"
                                    min="1"
                                    max={maxTradable}
                                  />
                                  <button 
                                    onClick={() => handleTrade(trade, parseInt(tradeAmounts[trade.id] || '0'))}
                                    disabled={!tradeAmounts[trade.id] || parseInt(tradeAmounts[trade.id]) <= 0 || parseInt(tradeAmounts[trade.id]) > maxTradable}
                                    className="bg-[#5a5a40] text-white p-2 rounded-lg hover:bg-[#7a7a60] disabled:opacity-30 transition-all flex items-center justify-center"
                                  >
                                    <Check className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div 
                key="map"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* World Switcher */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {worlds.map((world, idx) => (
                    <button
                      key={world.id}
                      onClick={() => world.isUnlocked ? switchWorld(idx) : buyWorld(idx)}
                      className={`stardew-card p-4 flex flex-col items-center gap-2 transition-all ${
                        currentWorldIndex === idx 
                        ? 'bg-[#5a5a40] text-white border-white' 
                        : world.isUnlocked ? 'bg-white hover:bg-[#e5e5d0]' : 'bg-gray-200 opacity-70'
                      }`}
                    >
                      <Globe className={`w-6 h-6 ${currentWorldIndex === idx ? 'text-white' : 'text-[#5a5a40]'}`} />
                      <span className="text-xs font-bold">{world.name}</span>
                      {!world.isUnlocked && (
                        <span className="text-[10px] bg-[#5a5a40] text-white px-2 py-0.5 rounded-full">
                          {formatMoney(WORLD_COSTS[idx])}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="stardew-card p-6 bg-[#5a5a40] text-[#f5f5f0] flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Compass className="w-8 h-8" />
                    <div>
                      <h2 className="font-serif text-2xl font-bold">{worlds[currentWorldIndex].name} Keşfi</h2>
                      <p className="text-sm opacity-80">Haritada dolaşarak gizli hazineler ve fabrikalar bul.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={refreshMap}
                      className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg flex items-center gap-2 border border-white/20 transition-all"
                      title={`Haritayı Yenile (${formatMoney(MAP_REFRESH_COST)})`}
                    >
                      <RefreshCw className="w-5 h-5" />
                      <span className="text-sm font-bold">Haritayı Yenile</span>
                    </button>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                      <Navigation className="w-4 h-4" />
                      <span className="font-mono font-bold">X: {mapPosition.x} Y: {mapPosition.y}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 bg-[#e5e5d0] p-4 rounded-2xl border-4 border-[#5a5a40] shadow-inner overflow-auto">
                    <div className="grid grid-cols-15 gap-1 min-w-[600px]">
                      {gameMap.map((row, y) => (
                        row.map((tile, x) => {
                          const isPlayer = mapPosition.x === x && mapPosition.y === y;
                          const block = tile.type === 'block' ? BLOCKS.find(b => b.id === tile.blockId) : null;
                          
                          return (
                            <div 
                              key={`${x}-${y}`}
                              onClick={() => handleTileClick(x, y)}
                              className={`aspect-square rounded-md border border-black/5 flex items-center justify-center transition-all cursor-pointer ${
                                isPlayer 
                                ? 'bg-[#5a5a40] scale-110 z-10 shadow-lg' 
                                : block ? block.color : 'bg-white/40 hover:bg-white/60'
                              }`}
                            >
                              {isPlayer ? (
                                <User className="w-6 h-6 text-white animate-pulse" />
                              ) : (
                                tile.type === 'valley' ? <Gift className="w-4 h-4 text-yellow-600 opacity-40" /> :
                                tile.type === 'factory' ? <Factory className="w-4 h-4 text-blue-600 opacity-40" /> :
                                tile.type === 'trader' ? <Repeat className="w-4 h-4 text-purple-600 opacity-40" /> :
                                block ? <block.icon className="w-4 h-4 text-white/50" /> :
                                null
                              )}
                            </div>
                          );
                        })
                      ))}
                    </div>
                  </div>

                  <div className="w-full lg:w-72 flex flex-col gap-6">
                    {/* Controls */}
                    <div className="space-y-4">
                      <h3 className="font-serif text-lg font-bold border-b border-[#5a5a40] pb-1">Kontroller</h3>
                      <div className="grid grid-cols-3 gap-2">
                        <div />
                        <button onClick={() => movePlayer(0, -1)} className="stardew-card p-3 flex items-center justify-center hover:bg-[#e5e5d0] active:scale-95 transition-all">
                          <ChevronRight className="w-6 h-6 -rotate-90" />
                        </button>
                        <div />
                        <button onClick={() => movePlayer(-1, 0)} className="stardew-card p-3 flex items-center justify-center hover:bg-[#e5e5d0] active:scale-95 transition-all">
                          <ChevronRight className="w-6 h-6 rotate-180" />
                        </button>
                        <button onClick={() => movePlayer(0, 1)} className="stardew-card p-3 flex items-center justify-center hover:bg-[#e5e5d0] active:scale-95 transition-all">
                          <ChevronRight className="w-6 h-6 rotate-90" />
                        </button>
                        <button onClick={() => movePlayer(1, 0)} className="stardew-card p-3 flex items-center justify-center hover:bg-[#e5e5d0] active:scale-95 transition-all">
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    {/* Build Mode */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[#5a5a40] pb-1">
                        <h3 className="font-serif text-lg font-bold">İnşa Modu</h3>
                        <button 
                          onClick={() => setBuildMode(!buildMode)}
                          className={`p-2 rounded-lg transition-all ${buildMode ? 'bg-[#5a5a40] text-white' : 'bg-gray-200 text-gray-500'}`}
                        >
                          {buildMode ? <Hammer className="w-5 h-5" /> : <Eraser className="w-5 h-5" />}
                        </button>
                      </div>
                      
                      {buildMode && (
                        <div className="space-y-4">
                          <p className="text-[10px] uppercase font-bold opacity-60">Blok Seçimi</p>
                          <div className="grid grid-cols-4 gap-2">
                            <button 
                              onClick={() => setSelectedBlockId(null)}
                              className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${selectedBlockId === null ? 'border-[#5a5a40] bg-[#e5e5d0]' : 'border-transparent bg-gray-100'}`}
                              title="Kırma Modu"
                            >
                              <Eraser className="w-5 h-5 text-red-500" />
                            </button>
                            {BLOCKS.map(block => (
                              <button
                                key={block.id}
                                onClick={() => setSelectedBlockId(block.id)}
                                className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all relative ${selectedBlockId === block.id ? 'border-[#5a5a40] bg-[#e5e5d0]' : 'border-transparent bg-gray-100'}`}
                                title={block.name}
                              >
                                <div className={`w-6 h-6 ${block.color} rounded-sm mb-1`} />
                                <span className="text-[8px] font-bold absolute bottom-0.5 right-1">{inventory[block.id] || 0}</span>
                              </button>
                            ))}
                          </div>
                          <div className="bg-[#f5f5f0] p-3 rounded-lg text-xs italic border border-[#5a5a40]/20">
                            {selectedBlockId 
                              ? `${BLOCKS.find(b => b.id === selectedBlockId)?.name} yerleştirmek için haritaya tıkla.` 
                              : "Blok kırmak için haritaya tıkla."}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="stardew-card p-4 bg-[#f5f5f0] text-sm italic opacity-70">
                      İpucu: Haritadaki simgelere giderek ödülleri topla. İnşa moduyla dünyanı özelleştir!
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'leaderboard' && (
              <motion.div 
                key="leaderboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="stardew-card overflow-hidden"
              >
                <div className="bg-[#5a5a40] p-8 text-[#f5f5f0] text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                  <h2 className="font-serif text-4xl font-bold">En Zengin Çiftçiler</h2>
                  <p className="opacity-70">Vadi'nin en başarılı fabrikatörleri</p>
                </div>
                <div className="p-4 sm:p-8">
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => (
                      <div 
                        key={entry.uid} 
                        className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                          entry.uid === user?.uid ? 'border-yellow-500 bg-yellow-50' : 'border-[#5a5a40]/10 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                            index === 0 ? 'bg-yellow-400 text-white' : 
                            index === 1 ? 'bg-gray-300 text-white' : 
                            index === 2 ? 'bg-orange-400 text-white' : 'bg-[#e5e5d0] text-[#5a5a40]'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-bold text-lg">{entry.displayName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-[#5a5a40]">{formatMoney(entry.balance)}</span>
                          {entry.uid !== user?.uid && (
                            <button 
                              onClick={() => sendGift(entry.uid, entry.displayName)}
                              className="p-2 bg-[#5a5a40] text-white rounded-lg hover:bg-[#7a7a60] transition-all"
                              title="Hediye Gönder"
                            >
                              <Gift className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Notifications & Events */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
        <AnimatePresence>
          {activeEvent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#5a5a40] text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-yellow-400 flex items-center gap-4 min-w-[300px]"
            >
              <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                <Zap className="w-6 h-6 text-[#5a5a40]" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-yellow-400 uppercase text-xs tracking-widest">AKTİF ETKİNLİK</h4>
                <p className="font-serif text-lg font-bold leading-tight">
                  {GAME_EVENTS.find(e => e.id === activeEvent.id)?.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Timer className="w-3 h-3 opacity-60" />
                  <span className="text-[10px] font-mono opacity-60">
                    {Math.max(0, Math.floor((activeEvent.endTime - Date.now()) / 1000))}sn kaldı
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-2 ${
                n.type === 'success' ? 'bg-white border-green-500 text-green-600' : 
                n.type === 'error' ? 'bg-white border-red-500 text-red-600' :
                'bg-white border-blue-500 text-blue-600'
              }`}
            >
              {n.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
               n.type === 'error' ? <Skull className="w-6 h-6" /> : 
               <AlertCircle className="w-6 h-6" />}
              <span className="font-bold">{n.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile Navbar Overlay (Bottom) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-[#5a5a40] px-2 py-3 flex justify-around items-center z-50">
        {[
          { id: 'market', icon: ShoppingCart, label: 'Market' },
          { id: 'warehouse', icon: Package, label: 'Depo' },
          { id: 'npc', icon: Repeat, label: 'Takas' },
          { id: 'ranks', icon: Award, label: 'Rütbe' },
          { id: 'city', icon: Home, label: 'Şehir' },
          { id: 'workers', icon: Users, label: 'İşçi' },
          { id: 'marketblok', icon: Box, label: 'Blok' },
          { id: 'map', icon: MapIcon, label: 'Harita' },
          { id: 'leaderboard', icon: Trophy, label: 'Sıralama' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
              activeTab === tab.id ? 'text-[#5a5a40] scale-110 font-bold' : 'text-zinc-400'
            }`}
          >
            <tab.icon className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
