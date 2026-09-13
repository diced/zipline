import assert from 'assert/strict';
import { test } from 'node:test';
import type { Role } from '@/lib/db/enums';
import { canInteract, canManage, interactableRoles, isAdministrator } from '@/lib/role';

const roles: (Role | undefined)[] = [undefined, 'USER', 'ADMIN', 'SUPERADMIN'];

test('role permissions cover every current and target role', () => {
  const allowed = new Set(['ADMIN:USER', 'SUPERADMIN:USER', 'SUPERADMIN:ADMIN']);

  for (const current of roles)
    for (const target of roles)
      assert.equal(canInteract(current, target), allowed.has(`${current}:${target}`), `${current}:${target}`);
});

test('administrator detection and interactable roles agree with the permission matrix', () => {
  for (const role of roles) {
    assert.equal(isAdministrator(role), role === 'ADMIN' || role === 'SUPERADMIN');
    assert.deepEqual(
      interactableRoles(role),
      roles.filter((target): target is Role => !!target && canInteract(role, target)),
    );
  }
});

test('users can manage themselves but cannot manage other users at the same rank', () => {
  for (const role of ['USER', 'ADMIN', 'SUPERADMIN'] as const) {
    assert.equal(canManage({ id: 'a', role }, { id: 'a', role }), true);
    assert.equal(canManage({ id: 'a', role }, { id: 'b', role }), false);
  }

  assert.equal(canManage({ id: 'a', role: 'ADMIN' }, { id: 'b', role: 'USER' }), true);
});

test('missing identities never grant management access', () => {
  assert.equal(canManage(), false);
  assert.equal(canManage(null, { id: 'a', role: 'USER' }), false);
  assert.equal(canManage({ id: 'a', role: 'SUPERADMIN' }, null), false);
});
