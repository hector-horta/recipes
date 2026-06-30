import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationService } from '../services/OrganizationService.js';
import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { UserOrganization } from '../models/UserOrganization.js';
import { Profile } from '../models/Profile.js';
import { sequelize } from '../config/database.js';

vi.mock('../models/Organization.js', () => ({
  Organization: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('../models/User.js', () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('../models/UserOrganization.js', () => ({
  UserOrganization: {
    findOne: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock('../models/Profile.js', () => ({
  Profile: {
    create: vi.fn()
  }
}));
vi.mock('../config/database.js', () => ({
  sequelize: {
    transaction: vi.fn(async (cb) => cb({})),
    define: vi.fn(() => ({
      belongsTo: vi.fn(),
      hasMany: vi.fn()
    }))
  }
}));

vi.mock('../services/RecipeProvider.js', () => ({
  RecipeProvider: {
    clearCache: vi.fn()
  }
}));

vi.mock('../services/ActivityLogger.js', () => ({
  ActivityLogger: {
    log: vi.fn()
  }
}));

describe('OrganizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllOrganizations', () => {
    it('should return all organizations mapped with active status and userCount', async () => {
      const mockOrgs = [
        {
          id: '1',
          name: 'Org A',
          slug: 'org-a',
          is_active: true,
          getDataValue: vi.fn((key) => {
            if (key === 'userCount') return '5';
            return undefined;
          }),
          toJSON: function() {
            return { id: this.id, name: this.name, slug: this.slug, is_active: this.is_active };
          }
        }
      ];

      Organization.findAll.mockResolvedValue(mockOrgs);

      const result = await OrganizationService.getAllOrganizations();

      expect(result).toEqual([
        { id: '1', name: 'Org A', slug: 'org-a', is_active: true, status: 'active', userCount: 5 }
      ]);
      expect(Organization.findAll).toHaveBeenCalled();
    });
  });

  describe('createOrganization', () => {
    it('should create organization if name/slug are unique', async () => {
      Organization.findOne.mockResolvedValue(null);
      Organization.create.mockResolvedValue({ id: '2', name: 'Org B', slug: 'org-b' });

      const result = await OrganizationService.createOrganization('Org B', 'org-b');

      expect(result).toEqual({ id: '2', name: 'Org B', slug: 'org-b' });
      expect(Organization.create).toHaveBeenCalledWith({
        name: 'Org B',
        slug: 'org-b',
        is_active: true,
        settings: {}
      });
    });

    it('should throw 409 error if organization already exists', async () => {
      Organization.findOne.mockResolvedValue({ id: '1' });

      await expect(
        OrganizationService.createOrganization('Org A', 'org-a')
      ).rejects.toThrow('Ya existe una organización con ese nombre o slug.');
    });
  });

  describe('updateOrganization', () => {
    it('should update organization fields if unique', async () => {
      const mockOrg = {
        id: '1',
        name: 'Org A',
        slug: 'org-a',
        is_active: true,
        update: vi.fn(async (fields) => {
          Object.assign(mockOrg, fields);
        }),
        toJSON: function() {
          return { id: this.id, name: this.name, slug: this.slug, is_active: this.is_active };
        }
      };

      Organization.findByPk.mockResolvedValue(mockOrg);
      Organization.findOne.mockResolvedValue(null);

      const result = await OrganizationService.updateOrganization('1', { name: 'Org New', slug: 'org-new', is_active: false });

      expect(result).toEqual({ id: '1', name: 'Org New', slug: 'org-new', is_active: false, status: 'suspended' });
      expect(mockOrg.update).toHaveBeenCalledWith({ name: 'Org New', slug: 'org-new', is_active: false });
    });
  });

  describe('toggleOrganizationStatus', () => {
    it('should toggle is_active status of organization', async () => {
      const mockOrg = {
        id: '1',
        is_active: true,
        update: vi.fn(async (fields) => {
          Object.assign(mockOrg, fields);
        })
      };

      Organization.findByPk.mockResolvedValue(mockOrg);

      const result = await OrganizationService.toggleOrganizationStatus('1');

      expect(result.is_active).toBe(false);
      expect(mockOrg.update).toHaveBeenCalledWith({ is_active: false });
    });
  });

  describe('getOrganizationDetails', () => {
    it('should return org details with user list', async () => {
      const mockOrg = {
        id: '1',
        name: 'Org A',
        is_active: true,
        users: [
          {
            id: 'u1',
            email: 'user1@test.com',
            display_name: 'User One',
            is_active: true,
            UserOrganization: { role: 'admin', created_at: '2026-05-19T00:00:00Z' }
          }
        ],
        toJSON: function() {
          return { id: this.id, name: this.name, is_active: this.is_active, users: this.users };
        }
      };

      Organization.findByPk.mockResolvedValue(mockOrg);

      const result = await OrganizationService.getOrganizationDetails('1');

      expect(result.userCount).toBe(1);
      expect(result.users).toEqual([
        {
          id: 'u1',
          email: 'user1@test.com',
          displayName: 'User One',
          isActive: true,
          role: 'admin',
          joinedAt: '2026-05-19T00:00:00Z'
        }
      ]);
    });
  });

  describe('addUserToOrganization', () => {
    it('should associate existing user to organization', async () => {
      const mockOrg = { id: '1' };
      const mockUser = { id: 'u1', email: 'user@test.com', display_name: 'User', is_active: true };

      Organization.findByPk.mockResolvedValue(mockOrg);
      User.findOne.mockResolvedValue(mockUser);
      UserOrganization.findOne.mockResolvedValue(null);
      UserOrganization.create.mockResolvedValue({ role: 'user', created_at: '2026-05-19' });

      const result = await OrganizationService.addUserToOrganization('1', { displayName: 'User', email: 'user@test.com', role: 'user' });

      expect(result.id).toBe('u1');
      expect(result.createdNewUser).toBe(false);
      expect(UserOrganization.create).toHaveBeenCalled();
    });

    it('should create new user and associate if email does not exist', async () => {
      const mockOrg = { id: '1' };
      const mockUser = { id: 'u2', email: 'new@test.com', display_name: 'New User', is_active: true };

      Organization.findByPk.mockResolvedValue(mockOrg);
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      UserOrganization.create.mockResolvedValue({ role: 'admin', created_at: '2026-05-19' });

      const result = await OrganizationService.addUserToOrganization('1', { displayName: 'New User', email: 'new@test.com', role: 'admin' });

      expect(result.id).toBe('u2');
      expect(result.createdNewUser).toBe(true);
      expect(Profile.create).toHaveBeenCalledWith({ user_id: 'u2', language: 'es' });
    });
  });

  describe('bulkAddUsersToOrganization', () => {
    it('should bulk process users and return results summary', async () => {
      const mockOrg = { id: '1' };
      Organization.findByPk.mockResolvedValue(mockOrg);
      User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'u3' }); // u1 new, u2 existing
      User.create.mockResolvedValue({ id: 'u4' });
      UserOrganization.findOne.mockResolvedValue(null);

      const usersToLoad = [
        { displayName: 'New Bulk', email: 'newbulk@test.com', role: 'user' },
        { displayName: 'Exist Bulk', email: 'existbulk@test.com', role: 'admin' }
      ];

      const result = await OrganizationService.bulkAddUsersToOrganization('1', usersToLoad);

      expect(result.total).toBe(2);
      expect(result.created).toBe(1);
      expect(result.associated).toBe(1);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('removeUserFromOrganization', () => {
    it('should destroy association if exists', async () => {
      const mockOrg = { id: '1' };
      const mockRelation = { destroy: vi.fn() };

      Organization.findByPk.mockResolvedValue(mockOrg);
      UserOrganization.findOne.mockResolvedValue(mockRelation);

      const result = await OrganizationService.removeUserFromOrganization('1', 'u1');

      expect(result.message).toContain('Usuario removido');
      expect(mockRelation.destroy).toHaveBeenCalled();
    });
  });
});
