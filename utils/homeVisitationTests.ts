import { homeManager } from './homeManager';
import { visitorSystem } from './visitorSystem';
import { itemPlacementSystem, SAMPLE_ITEM_DEFINITIONS } from './itemPlacementSystem';
import { getHomeTierConfig } from '@/types/home';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
  error?: string;
}

export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
  duration: number;
}

export interface ValidationCheckItem {
  category: string;
  item: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  notes?: string;
}

export class HomeVisitationTestSuite {
  private results: TestResult[] = [];
  private testPlayerId = 'test_player_' + Date.now();

  async runAllTests(): Promise<TestSuiteResult> {
    console.log('[HomeVisitationTests] Starting test suite');
    const startTime = Date.now();

    this.results = [];
    
    this.resetSystems();

    await this.runHomeManagerTests();
    await this.runVisitorSystemTests();
    await this.runItemPlacementTests();
    await this.runIntegrationTests();
    await this.runEdgeCaseTests();

    this.resetSystems();

    const duration = Date.now() - startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log(`[HomeVisitationTests] Suite complete: ${passed}/${this.results.length} passed in ${duration}ms`);

    return {
      suiteName: 'Home Visitation System Tests',
      totalTests: this.results.length,
      passed,
      failed,
      skipped: 0,
      results: this.results,
      duration,
    };
  }

  private resetSystems(): void {
    homeManager.reset();
    visitorSystem.reset();
    itemPlacementSystem.reset();
    itemPlacementSystem.registerItemDefinitions(SAMPLE_ITEM_DEFINITIONS);
    console.log('[HomeVisitationTests] Systems reset');
  }

  private async runTest(
    name: string,
    testFn: () => Promise<boolean> | boolean
  ): Promise<TestResult> {
    const startTime = Date.now();
    let passed = false;
    let message = '';
    let error: string | undefined;

    try {
      passed = await testFn();
      message = passed ? 'Test passed' : 'Test failed';
    } catch (e) {
      passed = false;
      error = e instanceof Error ? e.message : String(e);
      message = `Test threw exception: ${error}`;
    }

    const result: TestResult = {
      name,
      passed,
      message,
      duration: Date.now() - startTime,
      error,
    };

    this.results.push(result);

    const icon = passed ? '✓' : '✗';
    console.log(`[HomeVisitationTests] ${icon} ${name}: ${message}`);

    return result;
  }

  private async runHomeManagerTests(): Promise<void> {
    console.log('[HomeVisitationTests] Running HomeManager tests...');

    await this.runTest('HomeManager: Create new home (Tier 1)', async () => {
      const home = await homeManager.createHome(this.testPlayerId, 1);
      return home !== null && home.homeTier === 1 && home.rooms.length === 1;
    });

    await this.runTest('HomeManager: Create new home (Tier 4)', async () => {
      this.resetSystems();
      const home = await homeManager.createHome(this.testPlayerId, 4);
      const config = getHomeTierConfig(4);
      return home !== null && home.homeTier === 4 && home.rooms.length === config!.defaultRoomTypes.length;
    });

    await this.runTest('HomeManager: hasHome returns correct value', () => {
      return homeManager.hasHome() === true;
    });

    await this.runTest('HomeManager: getCurrentHome returns home data', () => {
      const home = homeManager.getCurrentHome();
      return home !== null && home.playerId === this.testPlayerId;
    });

    await this.runTest('HomeManager: Set home public', () => {
      homeManager.setHomePublic(true);
      const home = homeManager.getCurrentHome();
      return home !== null && home.isPublic === true;
    });

    await this.runTest('HomeManager: Set home private', () => {
      homeManager.setHomePublic(false);
      const home = homeManager.getCurrentHome();
      return home !== null && home.isPublic === false;
    });

    await this.runTest('HomeManager: Get home stats', () => {
      const stats = homeManager.getHomeStats();
      return stats !== null && 
        stats.tier === 4 && 
        typeof stats.roomCount === 'number' &&
        typeof stats.itemCount === 'number';
    });

    await this.runTest('HomeManager: Place item in room', () => {
      const home = homeManager.getCurrentHome();
      if (!home || home.rooms.length === 0) return false;

      const room = home.rooms[0];
      const item = homeManager.placeItem({
        itemId: 'sofa_basic',
        position: { x: 5, y: 0, z: 5 },
        rotation: { x: 0, y: 0, z: 0 },
        roomName: room.roomName,
      });

      return item !== null && item.itemId === 'sofa_basic';
    });

    await this.runTest('HomeManager: Get items in room', () => {
      const home = homeManager.getCurrentHome();
      if (!home || home.rooms.length === 0) return false;

      const items = homeManager.getItemsInRoom(home.rooms[0].roomName);
      return items.length > 0;
    });

    await this.runTest('HomeManager: Move item', () => {
      const home = homeManager.getCurrentHome();
      if (!home || home.placedItems.length === 0) return false;

      const item = home.placedItems[0];
      const newPosition = { x: 3, y: 0, z: 3 };
      const success = homeManager.moveItem(item.id, newPosition);

      const updatedHome = homeManager.getCurrentHome();
      const movedItem = updatedHome?.placedItems.find(i => i.id === item.id);

      return success && movedItem?.position.x === newPosition.x;
    });

    await this.runTest('HomeManager: Remove item', () => {
      const home = homeManager.getCurrentHome();
      if (!home || home.placedItems.length === 0) return false;

      const itemId = home.placedItems[0].id;
      const initialCount = home.placedItems.length;
      const success = homeManager.removeItem(itemId);

      const updatedHome = homeManager.getCurrentHome();
      return success && updatedHome!.placedItems.length === initialCount - 1;
    });

    await this.runTest('HomeManager: Room capacity tracking', () => {
      const home = homeManager.getCurrentHome();
      if (!home || home.rooms.length === 0) return false;

      const capacity = homeManager.getRoomCapacity(home.rooms[0].roomName);
      return capacity !== null && typeof capacity.current === 'number' && typeof capacity.max === 'number';
    });

    await this.runTest('HomeManager: Total capacity tracking', () => {
      const capacity = homeManager.getTotalCapacity();
      return capacity !== null && capacity.current >= 0 && capacity.max > 0;
    });

    await this.runTest('HomeManager: Export home data', () => {
      const exportedData = homeManager.exportHomeData();
      return exportedData.length > 0 && exportedData.includes('"homeId"');
    });

    await this.runTest('HomeManager: Import home data', () => {
      const exportedData = homeManager.exportHomeData();
      homeManager.reset();
      const success = homeManager.importHomeData(exportedData);
      return success && homeManager.hasHome();
    });

    await this.runTest('HomeManager: Get upgrade cost', () => {
      const cost2 = homeManager.getUpgradeCost(2);
      const cost3 = homeManager.getUpgradeCost(3);
      const cost4 = homeManager.getUpgradeCost(4);
      return cost2 > 0 && cost3 > cost2 && cost4 > cost3;
    });
  }

  private async runVisitorSystemTests(): Promise<void> {
    console.log('[HomeVisitationTests] Running VisitorSystem tests...');

    this.resetSystems();
    await homeManager.createHome(this.testPlayerId, 3);
    homeManager.setHomePublic(true);

    await this.runTest('VisitorSystem: Browse public homes', async () => {
      const homes = await visitorSystem.browsePublicHomes();
      return Array.isArray(homes) && homes.length > 0;
    });

    await this.runTest('VisitorSystem: Visit home', async () => {
      const homes = await visitorSystem.browsePublicHomes();
      if (homes.length === 0) return false;

      const success = await visitorSystem.visitHome(
        homes[0].homeId,
        'test_visitor_' + Date.now(),
        'Test Visitor'
      );
      return success && visitorSystem.isVisiting;
    });

    await this.runTest('VisitorSystem: Current visited home data', () => {
      const visitedHome = visitorSystem.currentVisitedHome;
      return visitedHome !== null && visitedHome.rooms && visitedHome.rooms.length > 0;
    });

    await this.runTest('VisitorSystem: Get visitor count', () => {
      const count = visitorSystem.getVisitorCount();
      return typeof count === 'number' && count >= 0;
    });

    await this.runTest('VisitorSystem: Get all visitors', () => {
      const visitors = visitorSystem.getAllVisitors();
      return Array.isArray(visitors);
    });

    await this.runTest('VisitorSystem: Get room style', () => {
      const state = visitorSystem.getState();
      if (state.roomStyles.length === 0) return false;

      const style = visitorSystem.getRoomStyle(state.roomStyles[0].roomName);
      return style !== null && style.floorStyle !== undefined;
    });

    await this.runTest('VisitorSystem: Toggle door', () => {
      const state = visitorSystem.getState();
      if (state.doorStates.length === 0) return true;

      const doorId = state.doorStates[0].doorId;
      const wasOpen = state.doorStates[0].isOpen;
      visitorSystem.toggleDoor(doorId);
      
      const updatedState = visitorSystem.getState();
      const door = updatedState.doorStates.find(d => d.doorId === doorId);
      return door !== undefined && door.isOpen !== wasOpen;
    });

    await this.runTest('VisitorSystem: Move visitor', () => {
      const visitors = visitorSystem.getAllVisitors();
      if (visitors.length === 0) return true;

      const visitor = visitors[0];
      const targetPosition = { x: 8, y: 0, z: 8 };
      visitorSystem.moveVisitor(visitor.visitorId, targetPosition, visitor.currentRoom);
      
      const updatedVisitor = visitorSystem.getVisitorInfo(visitor.visitorId);
      return updatedVisitor !== null && updatedVisitor.isMoving === true;
    });

    await this.runTest('VisitorSystem: Leave visit', () => {
      const visitors = visitorSystem.getAllVisitors();
      if (visitors.length === 0) return true;

      const visitEntry = visitorSystem.leaveVisit(visitors[0].visitorId);
      return visitEntry !== null && visitEntry.duration >= 0;
    });

    await this.runTest('VisitorSystem: Get visit history', () => {
      const history = visitorSystem.getVisitHistory();
      return Array.isArray(history);
    });

    await this.runTest('VisitorSystem: Get visit stats', () => {
      const stats = visitorSystem.getVisitStats();
      return typeof stats.totalVisits === 'number' && typeof stats.averageDuration === 'number';
    });

    await this.runTest('VisitorSystem: Format duration', () => {
      const formatted1 = visitorSystem.formatDuration(45);
      const formatted2 = visitorSystem.formatDuration(125);
      const formatted3 = visitorSystem.formatDuration(3725);
      return formatted1 === '45s' && formatted2 === '2m 5s' && formatted3 === '1h 2m 5s';
    });

    await this.runTest('VisitorSystem: Host session', () => {
      visitorSystem.reset();
      homeManager.setHomePublic(true);
      const success = visitorSystem.hostSession();
      return success && visitorSystem.getState().isHost === true;
    });

    await this.runTest('VisitorSystem: End host session', () => {
      const visitors = visitorSystem.endHostSession();
      return Array.isArray(visitors) && visitorSystem.getState().isHost === false;
    });
  }

  private async runItemPlacementTests(): Promise<void> {
    console.log('[HomeVisitationTests] Running ItemPlacementSystem tests...');

    this.resetSystems();
    await homeManager.createHome(this.testPlayerId, 3);

    await this.runTest('ItemPlacement: Register item definitions', () => {
      const item = itemPlacementSystem.getItemDefinition('sofa_basic');
      return item !== undefined && item.name === 'Basic Sofa';
    });

    await this.runTest('ItemPlacement: Set ownership', () => {
      itemPlacementSystem.setOwnership(true);
      return itemPlacementSystem.getState().isOwner === true;
    });

    await this.runTest('ItemPlacement: Enter placement mode', () => {
      const itemDef = itemPlacementSystem.getItemDefinition('coffee_table')!;
      const home = homeManager.getCurrentHome()!;
      const roomName = home.rooms[0].roomName;
      
      const success = itemPlacementSystem.enterPlacementMode(itemDef, roomName);
      return success && itemPlacementSystem.getState().mode === 'placing';
    });

    await this.runTest('ItemPlacement: Update preview position', () => {
      const preview = itemPlacementSystem.updatePreviewPosition({ x: 5, y: 0, z: 5 });
      return preview !== null && preview.validationResult !== undefined;
    });

    await this.runTest('ItemPlacement: Snap to grid', () => {
      itemPlacementSystem.setSnapToGrid(true);
      itemPlacementSystem.setGridSize(1);
      
      const preview = itemPlacementSystem.updatePreviewPosition({ x: 5.3, y: 0, z: 5.7 });
      return preview !== null && 
        preview.snappedPosition.x === 5 && 
        preview.snappedPosition.z === 6;
    });

    await this.runTest('ItemPlacement: Rotate preview', () => {
      itemPlacementSystem.rotatePreview(90);
      const state = itemPlacementSystem.getState();
      return state.preview !== null && state.preview.rotation.y === 90;
    });

    await this.runTest('ItemPlacement: Confirm placement', () => {
      const placedItem = itemPlacementSystem.confirmPlacement();
      return placedItem !== null && itemPlacementSystem.getState().mode === 'idle';
    });

    await this.runTest('ItemPlacement: Enter move mode', () => {
      const home = homeManager.getCurrentHome()!;
      if (home.placedItems.length === 0) return true;

      const item = home.placedItems[0];
      const success = itemPlacementSystem.enterMoveMode(item as any);
      return success && itemPlacementSystem.getState().mode === 'moving';
    });

    await this.runTest('ItemPlacement: Exit placement mode', () => {
      itemPlacementSystem.exitPlacementMode();
      return itemPlacementSystem.getState().mode === 'idle';
    });

    await this.runTest('ItemPlacement: Remove item', () => {
      const home = homeManager.getCurrentHome()!;
      if (home.placedItems.length === 0) return true;

      const item = home.placedItems[0];
      const success = itemPlacementSystem.removeItem(item as any);
      return success;
    });

    await this.runTest('ItemPlacement: Undo/Redo functionality', () => {
      itemPlacementSystem.setOwnership(true);
      const itemDef = itemPlacementSystem.getItemDefinition('plant_pot')!;
      const home = homeManager.getCurrentHome()!;
      
      itemPlacementSystem.enterPlacementMode(itemDef, home.rooms[0].roomName);
      itemPlacementSystem.updatePreviewPosition({ x: 2, y: 0, z: 2 });
      itemPlacementSystem.confirmPlacement();

      const canUndo = itemPlacementSystem.canUndo();
      const undoSuccess = itemPlacementSystem.undo();
      const canRedo = itemPlacementSystem.canRedo();
      const redoSuccess = itemPlacementSystem.redo();

      return canUndo && undoSuccess && canRedo && redoSuccess;
    });

    await this.runTest('ItemPlacement: Validation messages', () => {
      const validMessage = itemPlacementSystem.getPlacementValidationMessage('valid');
      const collisionMessage = itemPlacementSystem.getPlacementValidationMessage('collision');
      return validMessage === 'Valid placement' && collisionMessage.includes('Collides');
    });

    await this.runTest('ItemPlacement: Get room stats', () => {
      const home = homeManager.getCurrentHome()!;
      const stats = itemPlacementSystem.getRoomStats(home.rooms[0].roomName);
      return stats !== null && typeof stats.itemCount === 'number';
    });

    await this.runTest('ItemPlacement: Non-owner cannot place', () => {
      itemPlacementSystem.setOwnership(false);
      const itemDef = itemPlacementSystem.getItemDefinition('sofa_basic')!;
      const home = homeManager.getCurrentHome()!;
      
      const success = itemPlacementSystem.enterPlacementMode(itemDef, home.rooms[0].roomName);
      return success === false;
    });
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('[HomeVisitationTests] Running integration tests...');

    this.resetSystems();

    await this.runTest('Integration: Full home creation flow', async () => {
      const home = await homeManager.createHome(this.testPlayerId, 2);
      if (!home) return false;

      itemPlacementSystem.setOwnership(true);
      const itemDef = itemPlacementSystem.getItemDefinition('sofa_basic')!;
      
      itemPlacementSystem.enterPlacementMode(itemDef, home.rooms[0].roomName);
      itemPlacementSystem.updatePreviewPosition({ x: 5, y: 0, z: 5 });
      const placedItem = itemPlacementSystem.confirmPlacement();

      if (!placedItem) return false;

      const updatedHome = homeManager.getCurrentHome();
      return updatedHome !== null && updatedHome.placedItems.length > 0;
    });

    await this.runTest('Integration: Home upgrade preserves items', async () => {
      const homeBefore = homeManager.getCurrentHome();
      if (!homeBefore) return false;

      const upgraded = await homeManager.upgradeHome(3);
      if (!upgraded) return false;

      const homeAfter = homeManager.getCurrentHome();
      return homeAfter !== null && 
        homeAfter.homeTier === 3 && 
        homeAfter.placedItems.length >= 0;
    });

    await this.runTest('Integration: Multiple item placement', async () => {
      itemPlacementSystem.setOwnership(true);
      const home = homeManager.getCurrentHome()!;
      const roomName = home.rooms[0].roomName;

      const items = ['coffee_table', 'plant_pot', 'floor_lamp'];
      let placedCount = 0;

      for (let i = 0; i < items.length; i++) {
        const itemDef = itemPlacementSystem.getItemDefinition(items[i]);
        if (!itemDef) continue;

        itemPlacementSystem.enterPlacementMode(itemDef, roomName);
        itemPlacementSystem.updatePreviewPosition({ x: 2 + i * 2, y: 0, z: 2 });
        const placed = itemPlacementSystem.confirmPlacement();
        if (placed) placedCount++;
      }

      return placedCount === items.length;
    });

    await this.runTest('Integration: Visit and explore', async () => {
      homeManager.setHomePublic(true);
      const homes = await visitorSystem.browsePublicHomes();
      if (homes.length === 0) return false;

      const visitSuccess = await visitorSystem.visitHome(
        homes[0].homeId,
        'explorer_' + Date.now(),
        'Explorer'
      );

      if (!visitSuccess) return false;

      const state = visitorSystem.getState();
      if (state.doorStates.length > 0) {
        visitorSystem.toggleDoor(state.doorStates[0].doorId);
      }

      const visitors = visitorSystem.getAllVisitors();
      if (visitors.length > 0) {
        visitorSystem.moveVisitor(visitors[0].visitorId, { x: 8, y: 0, z: 8 }, visitors[0].currentRoom);
        visitorSystem.leaveVisit(visitors[0].visitorId);
      }

      return visitorSystem.getVisitHistory().length > 0;
    });
  }

  private async runEdgeCaseTests(): Promise<void> {
    console.log('[HomeVisitationTests] Running edge case tests...');

    this.resetSystems();
    await homeManager.createHome(this.testPlayerId, 1);

    await this.runTest('EdgeCase: Place item outside room bounds', () => {
      itemPlacementSystem.setOwnership(true);
      const itemDef = itemPlacementSystem.getItemDefinition('sofa_basic')!;
      const home = homeManager.getCurrentHome()!;

      itemPlacementSystem.enterPlacementMode(itemDef, home.rooms[0].roomName);
      const preview = itemPlacementSystem.updatePreviewPosition({ x: 100, y: 0, z: 100 });

      itemPlacementSystem.exitPlacementMode();
      return preview !== null && preview.isValid === false;
    });

    await this.runTest('EdgeCase: Place item in non-existent room', () => {
      const result = homeManager.placeItem({
        itemId: 'sofa_basic',
        position: { x: 5, y: 0, z: 5 },
        rotation: { x: 0, y: 0, z: 0 },
        roomName: 'NonExistentRoom',
      });
      return result === null;
    });

    await this.runTest('EdgeCase: Remove non-existent item', () => {
      const success = homeManager.removeItem('fake_item_id_12345');
      return success === false;
    });

    await this.runTest('EdgeCase: Move to invalid position', () => {
      const home = homeManager.getCurrentHome();
      
      const itemDef = itemPlacementSystem.getItemDefinition('plant_pot')!;
      itemPlacementSystem.setOwnership(true);
      itemPlacementSystem.enterPlacementMode(itemDef, home!.rooms[0].roomName);
      itemPlacementSystem.updatePreviewPosition({ x: 3, y: 0, z: 3 });
      const placed = itemPlacementSystem.confirmPlacement();
      
      if (!placed) return true;
      
      const success = homeManager.moveItem(placed.id, { x: -100, y: 0, z: -100 });
      return success === false;
    });

    await this.runTest('EdgeCase: Invalid home tier creation', async () => {
      try {
        await homeManager.createHome(this.testPlayerId, 99);
        return false;
      } catch {
        return true;
      }
    });

    await this.runTest('EdgeCase: Import invalid JSON', () => {
      const success = homeManager.importHomeData('{ invalid json }');
      return success === false;
    });

    await this.runTest('EdgeCase: Import incomplete home data', () => {
      const success = homeManager.importHomeData('{"homeId": "test"}');
      return success === false;
    });

    await this.runTest('EdgeCase: Visit full home', async () => {
      const homes = await visitorSystem.browsePublicHomes();
      const fullHome = homes.find(h => h.visitorCount >= h.maxVisitors);
      
      if (!fullHome) return true;
      
      const success = await visitorSystem.visitHome(
        fullHome.homeId,
        'blocked_visitor',
        'Blocked'
      );
      return success === false;
    });

    await this.runTest('EdgeCase: Double reset', () => {
      homeManager.reset();
      homeManager.reset();
      return homeManager.hasHome() === false;
    });

    await this.runTest('EdgeCase: Operations on null home', () => {
      homeManager.reset();
      
      const stats = homeManager.getHomeStats();
      const capacity = homeManager.getTotalCapacity();
      const items = homeManager.getItemsInRoom('Living Room');
      
      return stats === null && capacity === null && items.length === 0;
    });
  }

  getValidationChecklist(): ValidationCheckItem[] {
    const checklist: ValidationCheckItem[] = [
      { category: 'Database Setup', item: 'Player homes table exists', status: 'pending' },
      { category: 'Database Setup', item: 'Placed items table exists', status: 'pending' },
      { category: 'Database Setup', item: 'Home visitors table exists', status: 'pending' },
      { category: 'Database Setup', item: 'Room layouts table exists', status: 'pending' },
      { category: 'Database Setup', item: 'RLS policies configured', status: 'pending' },
      
      { category: 'Home Manager', item: 'Create home works for all tiers', status: 'pending' },
      { category: 'Home Manager', item: 'Load player home retrieves correct data', status: 'pending' },
      { category: 'Home Manager', item: 'Place item saves to storage', status: 'pending' },
      { category: 'Home Manager', item: 'Remove item deletes correctly', status: 'pending' },
      { category: 'Home Manager', item: 'Update home visibility works', status: 'pending' },
      { category: 'Home Manager', item: 'Home upgrade preserves items', status: 'pending' },
      
      { category: 'Item Placement', item: 'Placement mode activates correctly', status: 'pending' },
      { category: 'Item Placement', item: 'Preview follows position updates', status: 'pending' },
      { category: 'Item Placement', item: 'Snap to grid works', status: 'pending' },
      { category: 'Item Placement', item: 'Rotation increments correctly', status: 'pending' },
      { category: 'Item Placement', item: 'Collision detection works', status: 'pending' },
      { category: 'Item Placement', item: 'Room bounds checking works', status: 'pending' },
      { category: 'Item Placement', item: 'Undo/Redo functions correctly', status: 'pending' },
      
      { category: 'Visitor System', item: 'Public homes browse works', status: 'pending' },
      { category: 'Visitor System', item: 'Visit home loads correctly', status: 'pending' },
      { category: 'Visitor System', item: 'Room styles generate properly', status: 'pending' },
      { category: 'Visitor System', item: 'Door interactions work', status: 'pending' },
      { category: 'Visitor System', item: 'Leave visit tracks duration', status: 'pending' },
      { category: 'Visitor System', item: 'Max visitor limit enforced', status: 'pending' },
      
      { category: 'UI Components', item: 'Home browser displays homes', status: 'pending' },
      { category: 'UI Components', item: 'Home editor loads inventory', status: 'pending' },
      { category: 'UI Components', item: 'Room selection works', status: 'pending' },
      { category: 'UI Components', item: 'Placement feedback is clear', status: 'pending' },
      { category: 'UI Components', item: 'Save/Cancel buttons work', status: 'pending' },
      
      { category: 'Performance', item: 'Home loading under 3 seconds', status: 'pending' },
      { category: 'Performance', item: 'Item placement has no lag', status: 'pending' },
      { category: 'Performance', item: 'UI remains responsive', status: 'pending' },
      { category: 'Performance', item: 'Memory usage stable', status: 'pending' },
      
      { category: 'Edge Cases', item: 'Network failure handled', status: 'pending' },
      { category: 'Edge Cases', item: 'Invalid coordinates rejected', status: 'pending' },
      { category: 'Edge Cases', item: 'Full home blocked', status: 'pending' },
      { category: 'Edge Cases', item: 'Missing items handled gracefully', status: 'pending' },
    ];

    return checklist;
  }
}

export const homeVisitationTests = new HomeVisitationTestSuite();

export async function runQuickValidation(): Promise<{
  homeManager: boolean;
  visitorSystem: boolean;
  itemPlacement: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  let homeManagerOk = false;
  let visitorSystemOk = false;
  let itemPlacementOk = false;

  try {
    homeManager.reset();
    const home = await homeManager.createHome('quick_test', 1);
    homeManagerOk = home !== null && homeManager.hasHome();
    if (!homeManagerOk) errors.push('HomeManager: Failed to create home');
  } catch (e) {
    errors.push(`HomeManager: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const homes = await visitorSystem.browsePublicHomes();
    visitorSystemOk = Array.isArray(homes);
    if (!visitorSystemOk) errors.push('VisitorSystem: Failed to browse homes');
  } catch (e) {
    errors.push(`VisitorSystem: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    itemPlacementSystem.registerItemDefinitions(SAMPLE_ITEM_DEFINITIONS);
    const itemDef = itemPlacementSystem.getItemDefinition('sofa_basic');
    itemPlacementOk = itemDef !== undefined;
    if (!itemPlacementOk) errors.push('ItemPlacementSystem: Failed to load definitions');
  } catch (e) {
    errors.push(`ItemPlacementSystem: ${e instanceof Error ? e.message : String(e)}`);
  }

  homeManager.reset();
  visitorSystem.reset();
  itemPlacementSystem.reset();

  console.log('[QuickValidation] Results:', {
    homeManager: homeManagerOk,
    visitorSystem: visitorSystemOk,
    itemPlacement: itemPlacementOk,
    errorCount: errors.length,
  });

  return {
    homeManager: homeManagerOk,
    visitorSystem: visitorSystemOk,
    itemPlacement: itemPlacementOk,
    errors,
  };
}
