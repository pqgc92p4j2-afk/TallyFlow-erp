const AccountGroup = require('../models/AccountGroup');

const getGroups = async (req, res) => {
  try {
    const groups = await AccountGroup.find({ company: req.user.activeCompany }).populate('parent', 'name').sort('name');
    const buildTree = (groups, parentId = null) => {
      return groups.filter(g => { if (parentId === null) return !g.parent; return g.parent && g.parent._id.toString() === parentId.toString(); })
        .map(g => ({ ...g.toObject(), children: buildTree(groups, g._id) }));
    };
    const tree = buildTree(groups);
    res.json({ success: true, data: groups, tree });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createGroup = async (req, res) => {
  try {
    req.body.company = req.user.activeCompany;
    const group = await AccountGroup.create(req.body);
    const populated = await AccountGroup.findById(group._id).populate('parent', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateGroup = async (req, res) => {
  try {
    const group = await AccountGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.isDefault) return res.status(400).json({ message: 'Cannot modify default groups' });
    const updated = await AccountGroup.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('parent', 'name');
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await AccountGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.isDefault) return res.status(400).json({ message: 'Cannot delete default groups' });
    const children = await AccountGroup.countDocuments({ parent: group._id });
    if (children > 0) return res.status(400).json({ message: 'Cannot delete group with sub-groups' });
    await group.deleteOne();
    res.json({ success: true, message: 'Group deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getGroups, createGroup, updateGroup, deleteGroup };
